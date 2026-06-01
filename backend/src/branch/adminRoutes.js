const express = require('express');
const branchAdminController = require('./branchAdminController');
const branchPointAdminController = require('./branchPointAdminController');
const auth = require('../middleware/auth');
const { branchFields } = require('./middleware/branchUpload');

const router = express.Router();

router.use(auth);

router.get('/demos', branchAdminController.listDemos);
router.get('/demos/:id', branchAdminController.getDemoTree);
router.get('/demos/:id/stats', branchAdminController.stats);
router.post('/demos/:id/prewarm', branchAdminController.prewarmDemo);

router.get('/tts/providers', branchAdminController.listTtsProviders);
router.put('/nodes/:id', branchAdminController.updateNode);
router.post('/nodes/:id/assets', branchFields(), branchAdminController.uploadNodeAssets);

router.get('/generation-options', branchPointAdminController.generationOptions);
router.get('/videos/:videoId/branch-points', branchPointAdminController.listByVideo);
router.post('/videos/:videoId/branch-points/analyze', branchPointAdminController.analyze);
router.post('/videos/:videoId/branch-points/prewarm', branchPointAdminController.prewarmVideo);
router.post('/branch-points', branchPointAdminController.create);
router.put('/branch-points/:id', branchPointAdminController.update);
router.delete('/branch-points/:id', branchPointAdminController.remove);
router.put('/branch-choices/:choiceId', branchPointAdminController.updateChoice);
router.post('/branch-choices/:choiceId/assets', branchFields(), branchPointAdminController.uploadChoiceAssets);

module.exports = router;
