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

class BranchClipService {
  async ensureClip({ sourceVideoUrl, startAt = 0, endAt, duration }) {
    const sourcePath = toAbsoluteUploadPath(sourceVideoUrl);
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return null;
    }

    const clipDuration = duration ?? (endAt != null ? endAt - startAt : 8);
    const cacheKey = branchAssetService.hashKey([
      'clip', sourceVideoUrl, startAt, endAt, clipDuration,
    ]);
    const outputPath = branchAssetService.generatedClipPath(cacheKey);

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return toPublicUploadUrl(outputPath);
    }

    const ffmpegBins = [...new Set([ffmpegPath, 'ffmpeg'].filter(Boolean))];
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-ss', String(Math.max(0, startAt)),
      '-i', sourcePath,
      '-t', String(Math.max(0.5, clipDuration)),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ];

    for (const bin of ffmpegBins) {
      try {
        await execFileAsync(bin, args, { timeout: 180000 });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          return toPublicUploadUrl(outputPath);
        }
      } catch (err) {
        console.warn('[branch-clip] ffmpeg 切片失败:', err.message);
      }
    }

    return null;
  }
}

module.exports = new BranchClipService();
