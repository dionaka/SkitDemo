const express = require('express');
const videoController = require('../controllers/user/videoController');
const interactionController = require('../controllers/user/interactionController');

const router = express.Router();

router.get('/videos', videoController.list);
router.get('/videos/:id', videoController.detail);
router.post('/interactions', interactionController.record);
router.get('/interactions/stats/:highlightId', interactionController.stats);

module.exports = router;
