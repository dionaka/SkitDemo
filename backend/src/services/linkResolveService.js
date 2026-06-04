const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const config = require('../config');
const { extractLinkFromText, matchPlatform, PLATFORM_LABELS, normalizeUrl } = require('../utils/linkPatterns');

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
  const fromEnv = process.env.BILI_COOKIES_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const defaultPath = path.join(config.uploadBasePath, 'cookies', 'bili_cookies.txt');
  return fs.existsSync(defaultPath) ? defaultPath : null;
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
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--no-progress',
    '--retries', '3',
    '--socket-timeout', '30',
    ...extra,
    url,
  ];

  const cookies = getBiliCookiesPath();
  if (cookies && matchPlatform(url) === 'bilibili') {
    args.unshift('--cookies', cookies);
  }

  return args;
}

async function runYtDlpJson(url) {
  const bin = await ensureYtDlp();
  const { stdout } = await execFileAsync(
    bin,
    buildYtDlpArgs(url, ['--dump-single-json', '--skip-download']),
    { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
  );
  return JSON.parse(stdout);
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
    const url = extractLinkFromText(textOrUrl);
    if (!url) {
      return { ok: false, message: '未识别到支持的链接（B站 / 抖音 / 小红书）' };
    }
    const platform = matchPlatform(url);
    return {
      ok: true,
      url,
      platform,
      platform_label: PLATFORM_LABELS[platform] || platform,
    };
  }

  async preview(textOrUrl) {
    const detected = this.detect(textOrUrl);
    if (!detected.ok) return detected;

    const url = detected.url;
    try {
      const info = await runYtDlpJson(url);
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
      return { ok: true, ...preview };
    } catch (err) {
      return {
        ok: false,
        message: err.message || '解析失败',
        platform: detected.platform,
        platform_label: detected.platform_label,
        source_url: url,
      };
    }
  }

  async downloadVideo(url, { onProgress } = {}) {
    const normalized = normalizeUrl(url);
    const platform = matchPlatform(normalized);
    if (!platform) {
      throw new Error('不支持的链接平台');
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
        else reject(new Error(stderr.trim() || `yt-dlp 退出码 ${code}`));
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
}

module.exports = new LinkResolveService();
