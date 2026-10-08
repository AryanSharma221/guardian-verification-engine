const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { NotFoundError } = require('../utils/errors');

router.patch('/:id', (req, res, next) => {
  try {
    const { included, inputs } = req.body;
    let stmt, info;
    if (included !== undefined && inputs !== undefined) {
       stmt = db.prepare('UPDATE tests SET included = ?, inputs = ? WHERE id = ?');
       info = stmt.run(included ? 1 : 0, typeof inputs === 'string' ? inputs : JSON.stringify(inputs), req.params.id);
    } else if (included !== undefined) {
       stmt = db.prepare('UPDATE tests SET included = ? WHERE id = ?');
       info = stmt.run(included ? 1 : 0, req.params.id);
    } else if (inputs !== undefined) {
       stmt = db.prepare('UPDATE tests SET inputs = ? WHERE id = ?');
       info = stmt.run(typeof inputs === 'string' ? inputs : JSON.stringify(inputs), req.params.id);
    }
    
    if (info && info.changes === 0) throw new NotFoundError('Test');
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: test });
  } catch (err) { next(err); }
});

module.exports = router;