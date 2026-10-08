const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const authorization = require('../engines/authorization');
const concurrency = require('../engines/concurrency');
const load = require('../engines/load');
const demo = require('../engines/demo');
const { NotFoundError } = require('../utils/errors');

router.get('/', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    // Check if mounted at /api/applications/:id/test-runs
    const appId = req.params.id;
    let items, total;
    
    if (appId) {
      items = db.prepare('SELECT * FROM test_runs WHERE application_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(appId, pageSize, offset);
      total = db.prepare('SELECT COUNT(*) as c FROM test_runs WHERE application_id = ?').get(appId).c;
    } else {
      items = db.prepare('SELECT * FROM test_runs ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset);
      total = db.prepare('SELECT COUNT(*) as c FROM test_runs').get().c;
    }
    
    res.json({ success: true, data: items, total, page, pageSize });
  } catch (err) { next(err); }
});

router.post('/authorization', async (req, res, next) => {
  try {
    const appId = req.body.application_id || req.params.id;
    const result = await authorization.runAuthorizationTests(appId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/concurrency', async (req, res, next) => {
  try {
    const appId = req.body.application_id || req.params.id;
    const opts = req.body.options || req.body;
    const result = await concurrency.runConcurrencyTests(appId, opts);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/load', async (req, res, next) => {
  try {
    const appId = req.body.application_id || req.params.id;
    const result = await load.runLoadTests(appId, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

const testRunner = require('../engines/testRunner');

router.post('/', async (req, res, next) => {
  try {
    const appId = req.body.application_id || req.params.id;
    const result = await testRunner.startTestRun(appId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/:id', (req, res, next) => {
  try {
    const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id);
    if (!run) throw new NotFoundError('Test Run');
    const results = db.prepare('SELECT * FROM test_results WHERE test_run_id = ?').all(req.params.id);
    run.test_results = results;
    res.json({ success: true, data: run });
  } catch (err) { next(err); }
});

router.post('/:id/pause', (req, res, next) => {
  try {
    const info = db.prepare("UPDATE test_runs SET status = 'PAUSED' WHERE id = ?").run(req.params.id);
    if (info.changes === 0) throw new NotFoundError('Test Run');
    res.json({ success: true, data: { id: req.params.id, status: 'PAUSED' } });
  } catch (err) { next(err); }
});

router.post('/:id/resume', (req, res, next) => {
  try {
    const info = db.prepare("UPDATE test_runs SET status = 'RUNNING' WHERE id = ?").run(req.params.id);
    if (info.changes === 0) throw new NotFoundError('Test Run');
    res.json({ success: true, data: { id: req.params.id, status: 'RUNNING' } });
  } catch (err) { next(err); }
});

router.post('/:id/stop', (req, res, next) => {
  try {
    const info = db.prepare("UPDATE test_runs SET status = 'stopped' WHERE id = ?").run(req.params.id);
    if (info.changes === 0) throw new NotFoundError('Test Run');
    res.json({ success: true, data: { id: req.params.id, status: 'stopped' } });
  } catch (err) { next(err); }
});

router.post('/compare', (req, res, next) => {
  try {
    const { run_id_a, run_id_b } = req.body;
    const runA = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(run_id_a);
    const runB = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(run_id_b);
    if (!runA || !runB) throw new NotFoundError('Test Run');
    
    const resultsA = db.prepare('SELECT * FROM test_results WHERE test_run_id = ?').all(run_id_a);
    const resultsB = db.prepare('SELECT * FROM test_results WHERE test_run_id = ?').all(run_id_b);
    
    res.json({ success: true, data: { runA: { ...runA, results: resultsA }, runB: { ...runB, results: resultsB } } });
  } catch (err) { next(err); }
});

module.exports = router;