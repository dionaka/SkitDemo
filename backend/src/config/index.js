require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');

module.exports = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET || 'realtimegen-demo-secret',
  uploadBasePath: path.resolve(__dirname, '../../', process.env.UPLOAD_BASE_PATH || '../uploads'),
};
