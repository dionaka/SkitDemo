const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const branchAssetService = require('./branchAssetService');
const { toAbsoluteUploadPath, toPublicUploadUrl } = require('./utils/paths');

const execFileAsync = promisify(execFile);

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch {
  ffmpegPath = null;
}

/**
 * 从主视频指定时间点截取参考帧，供 Seedream 图生图使用
 */
async function ensureReferenceFrame({ sourceVideoUrl, timestamp = 0 } = {}) {
  if (!sourceVideoUrl) return null;

  const sourcePath = toAbsoluteUploadPath(sourceVideoUrl);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return null;
  }

  const seekSec = Math.max(0, Math.floor(Number(timestamp) || 0));
  const cacheKey = branchAssetService.hashKey(['frame', sourceVideoUrl, seekSec]);
  const outputPath = branchAssetService.generatedFramePath(cacheKey);

  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return {
      frame_url: toPublicUploadUrl(outputPath),
      frame_path: outputPath,
      reference_timestamp: seekSec,
      source_video_url: sourceVideoUrl,
    };
  }

  const ffmpegBins = [...new Set([ffmpegPath, 'ffmpeg'].filter(Boolean))];
  const argsForSeek = (seek) => [
    '-hide_banner',
    '-loglevel', 'error',
    '-ss', String(seek),
    '-i', sourcePath,
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
      } catch (err) {
        console.warn('[branch-frame] 截帧失败:', err.message);
      }
    }
    return false;
  };

  if (await tryExtract(seekSec) || (seekSec !== 0 && await tryExtract(0))) {
    return {
      frame_url: toPublicUploadUrl(outputPath),
      frame_path: outputPath,
      reference_timestamp: seekSec,
      source_video_url: sourceVideoUrl,
    };
  }

  return null;
}

module.exports = {
  ensureReferenceFrame,
};
