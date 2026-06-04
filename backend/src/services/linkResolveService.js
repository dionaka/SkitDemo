const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const config = require('../config');
const {
  extractLinkFromText, matchPlatform, PLATFORM_LABELS, normalizeUrl, canonicalizeResolveUrl,
} = require('../utils/linkPatterns');
const bilibiliResolve = require('./bilibiliResolveService');
const biliCookiesService = require('./biliCookiesService');
const { BROWSER_UA } = bilibiliResolve;

const execFileAsync = promisify(execFile);

let ytDlpBinary = null;
let ytDlpInitPromise = null;

const PLATFORM_NAMES = {
  bilibili: 'B站',
  douyin: '抖音',
  xiaohongshu: '小红书',
};

function getMaxBytes() {
  const mb = Number(process.env.LINK_RESOLVE_MAX_MB || 200);
  return Math.max(10, mb) * 1024 * 1024;
}

function getBiliCookiesPath() {
  const filePath = biliCookiesService.resolveReadablePath();
  return fs.existsSync(filePath) ? filePath : null;
}

function resolveTargetUrl(textOrUrl) {
  const extracted = extractLinkFromText(textOrUrl);
  return extracted ? canonicalizeResolveUrl(extracted) : null;
}

function formatYtDlpError(err, platform) {
  const msg = String(err.stderr || err.message || err);
  if (platform === 'bilibili' && /412|Precondition Failed/i.test(msg)) {
    const cookiePath = getBiliCookiesPath();
    if (!cookiePath) {
      return (
        'B站返回 412，需要登录 Cookie。请在管理端「视频管理 → 链接解析 → B 站 Cookie 配置」粘贴并保存。'
      );
    }
    return (
      'B站返回 412，Cookie 可能已过期或 yt-dlp 版本过旧。'
      + ' 请重新导出 Cookie 并执行: ~/SkitDemo/backend/bin/yt-dlp -U'
    );
  }
  return msg.trim() || '解析失败';
}

function bundledYtDlpPath() {
  return path.join(__dirname, '../../bin/yt-dlp');
}

async function ensureYtDlp() {
  if (ytDlpBinary) return ytDlpBinary;
  if (!ytDlpInitPromise) {
    ytDlpInitPromise = (async () => {
      const bundled = bundledYtDlpPath();
      const candidates = [
        process.env.YT_DLP_PATH,
        fs.existsSync(bundled) ? bundled : null,
        'yt-dlp',
        '/usr/local/bin/yt-dlp',
        path.join(process.env.HOME || '', '.local/bin/yt-dlp'),
      ].filter(Boolean);

      for (const bin of candidates) {
        try {
          await execFileAsync(bin, ['--version'], { timeout: 15000 });
          ytDlpBinary = bin;
          return bin;
        } catch {
          // try next
        }
      }

      throw new Error(
        '未找到 yt-dlp。请在服务器安装：'
        + ' bash backend/scripts/install-yt-dlp.sh'
        + ' 或 pip install yt-dlp'
        + ' 或设置环境变量 YT_DLP_PATH=/path/to/yt-dlp'
      );
    })();
  }
  return ytDlpInitPromise;
}

function buildYtDlpArgs(url, extra = []) {
  const platform = matchPlatform(url);
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--no-progress',
    '--retries', '3',
    '--socket-timeout', '30',
  ];

  if (platform === 'bilibili') {
    args.push(
      '--add-header', `Referer:https://www.bilibili.com/`,
      '--add-header', `User-Agent:${BROWSER_UA}`,
    );
    const cookies = getBiliCookiesPath();
    if (cookies) {
      args.push('--cookies', cookies);
    }
  }

  if (platform === 'douyin') {
    args.push(
      '--add-header', `Referer:https://www.douyin.com/`,
      '--add-header', `User-Agent:${BROWSER_UA}`,
    );
  }

  if (platform === 'xiaohongshu') {
    args.push(
      '--add-header', `Referer:https://www.xiaohongshu.com/`,
      '--add-header', `User-Agent:${BROWSER_UA}`,
    );
  }

  args.push(...extra, url);
  return args;
}

async function runYtDlpJson(url) {
  const bin = await ensureYtDlp();
  try {
    const { stdout } = await execFileAsync(
      bin,
      buildYtDlpArgs(url, ['--dump-single-json', '--skip-download']),
      { timeout: 120000, maxBuffer: 10 * 1024 * 1024 },
    );
    return JSON.parse(stdout);
  } catch (err) {
    err.stderr = err.stderr || '';
    throw err;
  }
}

function mapPreview(info, sourceUrl) {
  const platform = matchPlatform(sourceUrl);
  const duration = Math.round(Number(info.duration) || 0);
  const filesize = Number(info.filesize || info.filesize_approx || 0);
  const isVideo = duration > 0 || (info.vcodec && info.vcodec !== 'none');

  return {
    platform,
    platform_label: PLATFORM_NAMES[platform] || platform,
    source_url: sourceUrl,
    title: info.title || info.fulltitle || '未命名',
    author: info.uploader || info.channel || info.creator || '',
    duration_seconds: duration,
    thumbnail: info.thumbnail || null,
    filesize_bytes: filesize || null,
    is_video: isVideo,
    extractor: info.extractor || info.extractor_key || '',
  };
}

class LinkResolveService {
  detect(textOrUrl) {
    const url = resolveTargetUrl(textOrUrl);
    if (!url) {
      return { ok: false, message: '未识别到支持的链接（B站 / 抖音 / 小红书）' };
    }
    const platform = matchPlatform(url);
    return {
      ok: true,
      url,
      platform,
      platform_label: PLATFORM_LABELS[platform] || platform,
      bili_cookie_configured: platform === 'bilibili' ? Boolean(getBiliCookiesPath()) : undefined,
    };
  }

  async preview(textOrUrl) {
    const detected = this.detect(textOrUrl);
    if (!detected.ok) return detected;

    const url = detected.url;
    try {
      let info;
      try {
        info = await runYtDlpJson(url);
      } catch (ytErr) {
        if (detected.platform === 'bilibili') {
          const fallback = await bilibiliResolve.previewByApi(url);
          return {
            ok: true,
            ...fallback,
            preview_source: 'bilibili-api',
            download_requires_cookie: !getBiliCookiesPath(),
            hint: getBiliCookiesPath()
              ? '预览来自 B 站 API；下载仍依赖 yt-dlp + Cookie'
              : '预览成功，但下载需配置 B 站 Cookie（uploads/cookies/bili_cookies.txt）',
          };
        }
        throw ytErr;
      }

      const preview = mapPreview(info, url);
      if (!preview.is_video) {
        return {
          ok: false,
          message: '该链接为图文内容，管理端仅支持导入视频',
          platform: detected.platform,
          platform_label: detected.platform_label,
        };
      }
      if (preview.filesize_bytes && preview.filesize_bytes > getMaxBytes()) {
        return {
          ok: false,
          message: `视频约 ${Math.round(preview.filesize_bytes / 1024 / 1024)}MB，超过限制 ${Math.round(getMaxBytes() / 1024 / 1024)}MB`,
          ...preview,
        };
      }
      return { ok: true, ...preview, preview_source: 'yt-dlp' };
    } catch (err) {
      return {
        ok: false,
        message: formatYtDlpError(err, detected.platform),
        platform: detected.platform,
        platform_label: detected.platform_label,
        source_url: url,
      };
    }
  }

  async downloadVideo(url, { onProgress } = {}) {
    const normalized = canonicalizeResolveUrl(normalizeUrl(url));
    const platform = matchPlatform(normalized);
    if (!platform) {
      throw new Error('不支持的链接平台');
    }

    if (platform === 'bilibili' && !getBiliCookiesPath()) {
      throw new Error(
        'B站下载需要 Cookie。请在管理端「链接解析 → B 站 Cookie 配置」粘贴并保存'
      );
    }

    const bin = await ensureYtDlp();
    const videosDir = path.join(config.uploadBasePath, 'videos');
    fs.mkdirSync(videosDir, { recursive: true });

    const tempBase = path.join(config.uploadBasePath, 'temp', `resolve_${Date.now()}`);
    const outputTemplate = `${tempBase}.%(ext)s`;

    const format = [
      'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio',
      'best[ext=mp4]/best',
    ].join('/');

    const args = buildYtDlpArgs(normalized, [
      '-f', format,
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--max-filesize', String(Math.round(getMaxBytes() / 1024 / 1024)) + 'M',
    ]);

    await new Promise((resolve, reject) => {
      const child = require('child_process').spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (onProgress) onProgress(chunk.toString());
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else {
          const errObj = { stderr, message: stderr };
          reject(Object.assign(
            new Error(formatYtDlpError(errObj, platform)),
            { stderr },
          ));
        }
      });
    });

    const dir = path.dirname(tempBase);
    const baseName = path.basename(tempBase);
    const files = fs.readdirSync(dir).filter((f) => f.startsWith(baseName));
    const downloaded = files.find((f) => /\.(mp4|webm|mkv|mov)$/i.test(f));
    if (!downloaded) {
      throw new Error('下载完成但未找到视频文件');
    }

    const srcPath = path.join(dir, downloaded);
    const stat = fs.statSync(srcPath);
    if (stat.size > getMaxBytes()) {
      fs.unlinkSync(srcPath);
      throw new Error(`视频超过大小限制 ${Math.round(getMaxBytes() / 1024 / 1024)}MB`);
    }

    const ext = path.extname(downloaded) || '.mp4';
    const destName = `video_${Date.now()}${ext}`;
    const destPath = path.join(videosDir, destName);
    fs.renameSync(srcPath, destPath);

    files.forEach((f) => {
      const p = path.join(dir, f);
      if (f !== downloaded && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    });

    return {
      videoUrl: `/uploads/videos/${destName}`,
      absolutePath: destPath,
      filesize: stat.size,
    };
  }

  async downloadThumbnail(thumbnailUrl) {
    if (!thumbnailUrl) return null;
    const coversDir = path.join(config.uploadBasePath, 'covers');
    fs.mkdirSync(coversDir, { recursive: true });

    const res = await fetch(thumbnailUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkitDemo/1.0)' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    const ext = thumbnailUrl.includes('.png') ? '.png' : '.jpg';
    const filename = `cover_${Date.now()}${ext}`;
    const dest = path.join(coversDir, filename);
    fs.writeFileSync(dest, buf);
    return `/uploads/covers/${filename}`;
  }

  async testBiliCookies(testUrl) {
    if (!getBiliCookiesPath()) {
      throw new Error('尚未保存 B 站 Cookie');
    }
    const url = canonicalizeResolveUrl(testUrl || 'https://www.bilibili.com/video/BV1xx411c7mD');
    const info = await runYtDlpJson(url);
    return {
      ok: true,
      test_url: url,
      title: info.title || info.fulltitle || '',
    };
  }
}

module.exports = new LinkResolveService();
