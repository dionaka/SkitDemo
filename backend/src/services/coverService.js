const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const config = require('../config');
const { DEFAULT_COVER_PATH, isPlaceholderCover } = require('../utils/defaultCover');
const { getFfmpegBins } = require('../utils/ffmpegPath');

const execFileAsync = promisify(execFile);

function toAbsoluteUploadPath(relativeUrl) {
  if (!relativeUrl?.startsWith('/uploads/')) return null;
  return path.join(config.uploadBasePath, relativeUrl.replace(/^\/uploads\//, ''));
}

function saveCoverImageFile(file) {
  const coversDir = path.join(config.uploadBasePath, 'covers');
  fs.mkdirSync(coversDir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const safeExt = allowed.includes(ext) ? ext : '.jpg';
  const filename = `cover_${Date.now()}${safeExt}`;
  const dest = path.join(coversDir, filename);
  fs.renameSync(file.path, dest);
  return `/uploads/covers/${filename}`;
}

async function extractFrameFromVideo(videoUrl, seekSec = 1) {
  const videoPath = toAbsoluteUploadPath(videoUrl);
  if (!videoPath || !fs.existsSync(videoPath)) {
    console.warn('[cover] 视频文件不存在:', videoUrl);
    return null;
  }

  const coversDir = path.join(config.uploadBasePath, 'covers');
  fs.mkdirSync(coversDir, { recursive: true });
  const filename = `cover_${Date.now()}.jpg`;
  const outputPath = path.join(coversDir, filename);

  const ffmpegBins = getFfmpegBins();
  const argsForSeek = (seek) => [
    '-hide_banner',
    '-loglevel', 'error',
    '-ss', String(seek),
    '-i', videoPath,
    '-frames:v', '1',
    '-q:v', '2',
    '-y',
    outputPath,
  ];

  const tryExtract = async (seek) => {
    for (const bin of ffmpegBins) {
      try {
        await execFileAsync(bin, argsForSeek(seek), { timeout: 120000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          return true;
        }
      } catch {
        // try next binary
      }
    }
    return false;
  };

  if (await tryExtract(seekSec)) {
    return `/uploads/covers/${filename}`;
  }
  if (seekSec !== 0 && await tryExtract(0)) {
    return `/uploads/covers/${filename}`;
  }

  console.warn('[cover] 视频截帧失败，请安装 ffmpeg（Linux: sudo apt install ffmpeg）');
  return null;
}

async function resolveCoverForUpload({ videoUrl, coverFile }) {
  if (coverFile) {
    return saveCoverImageFile(coverFile);
  }
  const extracted = await extractFrameFromVideo(videoUrl);
  return extracted || DEFAULT_COVER_PATH;
}

async function regenerateVideoCover(video) {
  if (!video?.video_url) return DEFAULT_COVER_PATH;
  const extracted = await extractFrameFromVideo(video.video_url);
  return extracted || video.cover_url || DEFAULT_COVER_PATH;
}

module.exports = {
  saveCoverImageFile,
  extractFrameFromVideo,
  resolveCoverForUpload,
  regenerateVideoCover,
  isPlaceholderCover,
};
