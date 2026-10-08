const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const { NotFoundError, ValidationError } = require('../utils/errors');

router.get('/', (req, res, next) => {
  try {
    const appId = req.params.id;
    const settings = db.prepare('SELECT * FROM safety_settings WHERE application_id = ?').get(appId);
    if (!settings) throw new NotFoundError('Safety Settings');
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

router.put('/', (req, res, next) => {
  try {
    const appId = req.params.id;
    const { max_requests_per_second, max_concurrent_tests, block_destructive, allowed_paths, excluded_paths, ownership_confirmation } = req.body;
    
    if (block_destructive === false && ownership_confirmation !== true && ownership_confirmation !== 1) {
      throw new ValidationError('ownership_confirmation is required for destructive writes');
    }
    
    const stmt = db.prepare('UPDATE safety_settings SET max_requests_per_second = ?, max_concurrent_tests = ?, block_destructive = ?, allowed_paths = ?, excluded_paths = ?, ownership_confirmation = ? WHERE application_id = ?');
    const info = stmt.run(max_requests_per_second, max_concurrent_tests, block_destructive, JSON.stringify(allowed_paths || []), JSON.stringify(excluded_paths || []), ownership_confirmation, appId);
    
    if (info.changes === 0) throw new NotFoundError('Safety Settings');
    
    const settings = db.prepare('SELECT * FROM safety_settings WHERE application_id = ?').get(appId);
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

module.exports = router;