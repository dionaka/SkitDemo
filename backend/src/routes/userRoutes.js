const express = require('express');
const videoController = require('../controllers/user/videoController');
const seriesController = require('../controllers/user/seriesController');
const interactionController = require('../controllers/user/interactionController');
const watchProgressController = require('../controllers/user/watchProgressController');

const router = express.Router();

router.get('/series', seriesController.list);
router.get('/series/:id/episodes', seriesController.episodesWithProgress);
router.get('/watch-progress/continue', watchProgressController.continueList);
router.get('/watch-progress/:videoId', watchProgressController.getOne);
router.put('/watch-progress/:videoId', watchProgressController.save);

router.get('/videos', videoController.list);
router.get('/videos/:id', videoController.detail);
router.post('/interactions', interactionController.record);
router.get('/interactions/stats/:highlightId', interactionController.stats);

module.exports = router;
