const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { toPublicUploadUrl } = require('./utils/paths');

class BranchAssetService {
  ensureDirs() {
    const dirs = [
      'branches/demo',
      'branches/generated/clips',
      'branches/generated/tts',
      'branches/generated/images',
      'branches/generated/frames',
      'branches/uploads',
    ];
    dirs.forEach((d) => fs.mkdirSync(path.join(config.uploadBasePath, d), { recursive: true }));
  }

  hashKey(parts) {
    return crypto.createHash('md5').update(parts.filter(Boolean).join('|')).digest('hex');
  }

  saveUploadedFile(file, subdir = 'branches/uploads') {
    this.ensureDirs();
    const ext = path.extname(file.originalname) || '';
    const filename = `branch_${Date.now()}${ext}`;
    const dest = path.join(config.uploadBasePath, subdir, filename);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(file.path, dest);
    return toPublicUploadUrl(dest);
  }

  generatedClipPath(cacheKey) {
    this.ensureDirs();
    return path.join(config.uploadBasePath, 'branches/generated/clips', `${cacheKey}.mp4`);
  }

  generatedTtsPath(cacheKey, ext = '.wav') {
    this.ensureDirs();
    return path.join(config.uploadBasePath, 'branches/generated/tts', `${cacheKey}${ext}`);
  }

  generatedImagePath(cacheKey, ext = '.png') {
    this.ensureDirs();
    return path.join(config.uploadBasePath, 'branches/generated/images', `${cacheKey}${ext}`);
  }

  generatedFramePath(cacheKey, ext = '.jpg') {
    this.ensureDirs();
    return path.join(config.uploadBasePath, 'branches/generated/frames', `${cacheKey}${ext}`);
  }
}

module.exports = new BranchAssetService();
