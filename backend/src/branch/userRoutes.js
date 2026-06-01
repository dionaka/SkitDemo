const express = require('express');
const branchController = require('./branchController');
const branchPointController = require('./branchPointController');

const router = express.Router();

router.get('/demos', branchController.listDemos);
router.get('/generators', branchController.listGenerators);
router.get('/demos/:id', branchController.getDemo);
router.get('/demos/:id/stats', branchController.stats);
router.get('/nodes/:id', branchController.getNode);
router.post('/demos/:id/choose', branchController.choose);

router.get('/videos/:videoId/branch-points', branchPointController.listByVideo);
router.get('/branch-points/:id', branchPointController.getDetail);
router.get('/branch-points/:id/stats', branchPointController.stats);
router.post('/branch-points/:id/choose', branchPointController.choose);

module.exports = router;
