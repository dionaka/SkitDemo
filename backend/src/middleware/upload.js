const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const tempDir = path.join(config.uploadBasePath, 'temp');
fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => cb(null, `upload_${Date.now()}${path.extname(file.originalname)}`),
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

module.exports = {
  single: videoUpload.single.bind(videoUpload),
  fields: videoUpload.fields.bind(videoUpload),
  imageSingle: imageUpload.single.bind(imageUpload),
};
