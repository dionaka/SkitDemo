const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execFileAsync = promisify(execFile);

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch {
  ffmpegPath = null;
}

function parseDurationFromFfmpegOutput(text) {
  const match = String(text || '').match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseFloat(match[3]);
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? Math.round(total) : null;
}

async function probeVideoDuration(videoPath) {
  if (!videoPath || !fs.existsSync(videoPath)) return null;

  const bins = [...new Set([ffmpegPath, 'ffmpeg'].filter(Boolean))];
  for (const bin of bins) {
    try {
      const { stderr } = await execFileAsync(
        bin,
        ['-hide_banner', '-nostdin', '-i', videoPath],
        { timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
      );
      const sec = parseDurationFromFfmpegOutput(stderr);
      if (sec) return sec;
    } catch (err) {
      const sec = parseDurationFromFfmpegOutput(err.stderr || err.stdout);
      if (sec) return sec;
    }
  }
  return null;
}

function getFfmpegBins() {
  return [...new Set([ffmpegPath, 'ffmpeg'].filter(Boolean))];
}

module.exports = {
  probeVideoDuration,
  parseDurationFromFfmpegOutput,
  getFfmpegBins,
};
