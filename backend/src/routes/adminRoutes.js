const express = require('express');
const adminController = require('../controllers/admin/adminController');
const videoAdminController = require('../controllers/admin/videoAdminController');
const highlightController = require('../controllers/admin/highlightController');
const settingsController = require('../controllers/admin/settingsController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/login', adminController.login);

router.use(auth);

router.get('/videos', videoAdminController.list);
router.post('/videos', upload.single('video_file'), videoAdminController.upload);
router.put('/videos/:id/publish', videoAdminController.publish);
router.post('/videos/:id/analyze', videoAdminController.analyze);

router.get('/highlights', highlightController.list);
router.post('/highlights', highlightController.create);
router.put('/highlights/:id', highlightController.update);
router.delete('/highlights/:id', highlightController.remove);

router.get('/settings/ai', settingsController.getAiSettings);
router.put('/settings/ai', settingsController.saveAiSettings);
router.post('/settings/ai/test', settingsController.testAiSettings);
router.delete('/settings/ai', settingsController.deleteAiSettings);

module.exports = router;
