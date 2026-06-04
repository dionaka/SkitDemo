const fs = require('fs');
const path = require('path');

let bundledFfmpeg = null;
try {
  bundledFfmpeg = require('ffmpeg-static');
} catch {
  bundledFfmpeg = null;
}

function getFfmpegBins() {
  const fromEnv = process.env.FFMPEG_PATH;
  const candidates = [
    fromEnv,
    bundledFfmpeg,
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg',
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function getPrimaryFfmpegBin() {
  return getFfmpegBins()[0] || 'ffmpeg';
}

module.exports = {
  getFfmpegBins,
  getPrimaryFfmpegBin,
};
