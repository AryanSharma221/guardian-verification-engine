const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const demo = require('../engines/demo');

router.post('/', async (req, res, next) => {
  try {
    const findingId = req.params.findingId;
    const result = await demo.runDemoRetest(findingId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/', (req, res, next) => {
  try {
    const findingId = req.params.findingId;
    const items = db.prepare('SELECT * FROM retests WHERE finding_id = ? ORDER BY id DESC').all(findingId);
    res.json({ success: true, data: items, total: items.length, page: 1, pageSize: items.length || 20 });
  } catch (err) { next(err); }
});

module.exports = router;