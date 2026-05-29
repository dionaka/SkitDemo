const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { ensureDefaultCovers } = require('./utils/defaultCover');
require('./services/secretsService');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadPath = config.uploadBasePath;
fs.mkdirSync(path.join(uploadPath, 'videos'), { recursive: true });
ensureDefaultCovers(uploadPath);
app.use('/uploads', express.static(uploadPath));

app.use('/api/v1', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ code: 500, message: err.message, data: null, timestamp: Date.now() });
});

const host = config.host || '0.0.0.0';
app.listen(config.port, host, () => {
  console.log(`\n🎬 短剧互动平台后端已启动: http://localhost:${config.port}`);
  console.log(`   局域网访问: http://<本机IP>:${config.port} （Android App 需配置此地址）`);
  console.log(`   用户端 API: http://localhost:${config.port}/api/v1`);
  console.log(`   管理端 API: http://localhost:${config.port}/api/admin`);
  console.log(`   文件目录:   ${uploadPath}\n`);

  const { backfillMissingCovers } = require('./services/coverBackfill');
  backfillMissingCovers().catch((err) => {
    console.warn('[cover] 启动时补生成封面失败:', err.message);
  });
});
