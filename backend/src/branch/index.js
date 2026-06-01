const { migrateBranchSchema } = require('./schema');
const { seedBranchDemoIfNeeded, prewarmBranchDemo } = require('./seedDemo');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');

async function initBranchModule() {
  migrateBranchSchema();
  seedBranchDemoIfNeeded();
  prewarmBranchDemo().catch((err) => {
    console.warn('[branch] 资源预热失败:', err.message);
  });
}

module.exports = {
  initBranchModule,
  userRoutes,
  adminRoutes,
};
