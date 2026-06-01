const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

const tempDir = path.join(config.uploadBasePath, 'temp');
fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => cb(null, `branch_${Date.now()}${path.extname(file.originalname)}`),
});

const branchUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
});

function branchFields() {
  return branchUpload.fields([
    { name: 'video_file', maxCount: 1 },
    { name: 'image_file', maxCount: 1 },
    { name: 'audio_file', maxCount: 1 },
  ]);
}

module.exports = { branchFields };
