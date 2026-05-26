const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
require('./services/secretsService');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadPath = config.uploadBasePath;
fs.mkdirSync(path.join(uploadPath, 'videos'), { recursive: true });
fs.mkdirSync(path.join(uploadPath, 'covers'), { recursive: true });
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

app.listen(config.port, () => {
  console.log(`\n🎬 短剧互动平台后端已启动: http://localhost:${config.port}`);
  console.log(`   用户端 API: http://localhost:${config.port}/api/v1`);
  console.log(`   管理端 API: http://localhost:${config.port}/api/admin`);
  console.log(`   文件目录:   ${uploadPath}\n`);
});
