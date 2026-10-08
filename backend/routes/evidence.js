const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const { NotFoundError } = require('../utils/errors');

router.get('/', (req, res, next) => {
  try {
    if (req.params.findingId) {
      const items = db.prepare('SELECT * FROM evidence WHERE finding_id = ?').all(req.params.findingId);
      return res.json({ success: true, data: items, total: items.length, page: 1, pageSize: items.length || 20 });
    } else if (req.params.resultId) {
      const items = db.prepare('SELECT * FROM evidence WHERE test_result_id = ?').all(req.params.resultId);
      return res.json({ success: true, data: items, total: items.length, page: 1, pageSize: items.length || 20 });
    }
    res.json({ success: true, data: [] });
  } catch (err) { next(err); }
});

router.post('/:id/replay', (req, res, next) => {
  try {
    const evidence = db.prepare('SELECT * FROM evidence WHERE id = ?').get(req.params.id);
    if (!evidence) throw new NotFoundError('Evidence');
    // For replay, just return the original evidence with same safety config
    res.json({ success: true, data: evidence, message: 'Replayed evidence' });
  } catch (err) { next(err); }
});

module.exports = router;