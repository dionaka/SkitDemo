const express = require('express');
const videoController = require('../controllers/user/videoController');
const seriesController = require('../controllers/user/seriesController');
const interactionController = require('../controllers/user/interactionController');
const watchProgressController = require('../controllers/user/watchProgressController');
const authController = require('../controllers/user/authController');
const searchController = require('../controllers/user/searchController');
const engagementController = require('../controllers/user/engagementController');
const backgroundController = require('../controllers/user/backgroundController');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authController.me);
router.post('/auth/avatar', upload.imageSingle('avatar_file'), authController.uploadAvatar);
router.get('/user/background', backgroundController.getBackground);
router.put('/user/background', backgroundController.updateBackground);
router.post('/user/background/image', upload.imageSingle('background_file'), backgroundController.uploadBackground);
router.delete('/user/background', backgroundController.clearBackground);
router.get('/search', searchController.search);

router.get('/series', seriesController.list);
router.get('/series/:id/engagement', engagementController.getSeriesEngagement);
router.post('/series/:id/like', engagementController.toggleLike);
router.post('/series/:id/favorite', engagementController.toggleFavorite);
router.get('/user/favorites', engagementController.listFavorites);
router.get('/series/:id/episodes', seriesController.episodesWithProgress);
router.get('/watch-progress/continue', watchProgressController.continueList);
router.delete('/watch-progress', watchProgressController.clearAll);
router.delete('/watch-progress/series/:seriesId', watchProgressController.removeBySeries);
router.get('/watch-progress/:videoId', watchProgressController.getOne);
router.put('/watch-progress/:videoId', watchProgressController.save);

router.get('/videos', videoController.list);
router.get('/videos/:id', videoController.detail);
router.post('/videos/:id/duration', videoController.syncDuration);
router.post('/interactions', interactionController.record);
router.get('/interactions/stats/:highlightId', interactionController.stats);

module.exports = router;
