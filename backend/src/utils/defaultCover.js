const fs = require('fs');
const path = require('path');

const DEFAULT_COVER_PATH = '/uploads/covers/default-cover.svg';
const LEGACY_COVER_NAMES = ['default-cover.jpg', 'demo-cover.jpg'];

function ensureDefaultCovers(uploadBasePath) {
  const coversDir = path.join(uploadBasePath, 'covers');
  fs.mkdirSync(coversDir, { recursive: true });

  const source = path.join(__dirname, '../../assets/default-cover.svg');
  if (!fs.existsSync(source)) {
    console.warn('[covers] default-cover.svg asset missing:', source);
    return DEFAULT_COVER_PATH;
  }

  const targets = ['default-cover.svg', ...LEGACY_COVER_NAMES];
  targets.forEach((name) => {
    const target = path.join(coversDir, name);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(source, target);
    }
  });

  return DEFAULT_COVER_PATH;
}

module.exports = {
  DEFAULT_COVER_PATH,
  ensureDefaultCovers,
};
