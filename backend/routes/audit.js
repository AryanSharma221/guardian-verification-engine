const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');

router.get('/', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    const appId = req.params.id;
    let items, total;
    
    if (appId) {
      items = db.prepare('SELECT * FROM audit_logs WHERE application_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(appId, pageSize, offset);
      total = db.prepare('SELECT COUNT(*) as c FROM audit_logs WHERE application_id = ?').get(appId).c;
    } else {
      items = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset);
      total = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
    }
    
    res.json({ success: true, data: items, total, page, pageSize });
  } catch (err) { next(err); }
});

module.exports = router;