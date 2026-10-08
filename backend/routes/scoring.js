const express = require('express');
const router = express.Router({ mergeParams: true });
const scoring = require('../engines/scoring');

router.get('/', async (req, res, next) => {
  try {
    const appId = req.params.id;
    const result = await scoring.calculateScore(appId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;