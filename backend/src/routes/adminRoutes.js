const express = require('express');
const adminController = require('../controllers/admin/adminController');
const videoAdminController = require('../controllers/admin/videoAdminController');
const seriesController = require('../controllers/admin/seriesController');
const highlightController = require('../controllers/admin/highlightController');
const settingsController = require('../controllers/admin/settingsController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/login', adminController.login);

router.use(auth);

router.get('/series', seriesController.list);
router.get('/videos', videoAdminController.list);
router.post('/videos', upload.fields([
  { name: 'video_file', maxCount: 1 },
  { name: 'cover_file', maxCount: 1 },
]), videoAdminController.upload);
router.put('/videos/:id', videoAdminController.update);
router.put('/videos/:id/cover', upload.imageSingle('cover_file'), videoAdminController.updateCover);
router.post('/videos/:id/regenerate-cover', videoAdminController.regenerateCover);
router.put('/videos/:id/publish', videoAdminController.publish);
router.delete('/videos/:id', videoAdminController.remove);
router.post('/videos/:id/analyze', videoAdminController.analyze);

router.get('/highlights', highlightController.list);
router.post('/highlights', highlightController.create);
router.put('/highlights/:id', highlightController.update);
router.delete('/highlights/:id', highlightController.remove);

router.get('/settings/ai', settingsController.getAiSettings);
router.put('/settings/ai', settingsController.saveAiSettings);
router.post('/settings/ai/test', settingsController.testAiSettings);
router.post('/settings/ai/test-image', settingsController.testImageSettings);
router.delete('/settings/ai', settingsController.deleteAiSettings);

router.get('/settings/tts', settingsController.getTtsSettings);
router.put('/settings/tts', settingsController.saveTtsSettings);
router.post('/settings/tts/test', settingsController.testTtsSettings);
router.delete('/settings/tts', settingsController.deleteTtsSettings);

router.get('/settings/siliconflow-tts', settingsController.getSiliconflowTtsSettings);
router.put('/settings/siliconflow-tts', settingsController.saveSiliconflowTtsSettings);
router.post('/settings/siliconflow-tts/test', settingsController.testSiliconflowTtsSettings);
router.delete('/settings/siliconflow-tts', settingsController.deleteSiliconflowTtsSettings);

module.exports = router;
