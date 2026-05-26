require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const aiModelService = require('../src/services/aiModelService');

async function main() {
  const sampleUrl = 'https://ark-public.tos-cn-beijing.volces.com/carcrash.mp4';
  const testPath = path.join(__dirname, 'data/test-video.mp4');

  fs.mkdirSync(path.dirname(testPath), { recursive: true });
  if (!fs.existsSync(testPath)) {
    console.log('下载测试视频...');
    const res = await fetch(sampleUrl);
    fs.writeFileSync(testPath, Buffer.from(await res.arrayBuffer()));
  }

  console.log('开始 AI 分析测试...');
  const highlights = await aiModelService.analyzeVideo(testPath, 30);
  console.log(JSON.stringify(highlights, null, 2));
}

main().catch((err) => {
  console.error('测试失败:', err.message);
  process.exit(1);
});
