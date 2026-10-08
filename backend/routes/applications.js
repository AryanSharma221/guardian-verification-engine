const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { runDiscovery, getDiscovery } = require('../engines/discovery');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { logAudit } = require('../middleware/auditLogger');

// POST /api/applications — Create a new application
router.post('/', (req, res, next) => {
  try {
    const { name, description, base_url, api_spec } = req.body;
    if (!name) throw new ValidationError('Application name is required.');

    const id = uuidv4();
    const ts = new Date().toISOString();

    db.prepare(`
      INSERT INTO applications (id, name, description, base_url, api_spec, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'created', ?, ?)
    `).run(id, name, description || '', base_url || '', api_spec || '', ts, ts);

    // Create default safety settings
    db.prepare(`
      INSERT INTO safety_settings (id, application_id, max_concurrency, max_requests_per_second, allow_destructive_writes, sandbox_mode, updated_at)
      VALUES (?, ?, 10, 50, 0, 1, ?)
    `).run(uuidv4(), id, ts);

    logAudit(id, 'application.created', 'application', id, { name });

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: app });
  } catch (err) { next(err); }
});

// GET /api/applications — List all applications (paginated)
router.get('/', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const items = db.prepare('SELECT * FROM applications ORDER BY created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset);
    const total = db.prepare('SELECT COUNT(*) as c FROM applications').get().c;

    res.json({ success: true, data: items, total, page, pageSize });
  } catch (err) { next(err); }
});

// GET /api/applications/:id — Get single application
router.get('/:id', (req, res, next) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) throw new NotFoundError(`Application ${req.params.id}`);
    res.json({ success: true, data: app });
  } catch (err) { next(err); }
});

// PUT /api/applications/:id — Update application
router.put('/:id', (req, res, next) => {
  try {
    const { name, description, base_url, api_spec } = req.body;
    const ts = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!existing) throw new NotFoundError('Application');

    db.prepare(`
      UPDATE applications SET 
        name = COALESCE(?, name), 
        description = COALESCE(?, description), 
        base_url = COALESCE(?, base_url),
        api_spec = COALESCE(?, api_spec),
        updated_at = ?
      WHERE id = ?
    `).run(name, description, base_url, api_spec, ts, req.params.id);

    logAudit(req.params.id, 'application.updated', 'application', req.params.id);

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: app });
  } catch (err) { next(err); }
});

// POST /api/applications/:id/discovery — Start discovery
router.post('/:id/discovery', (req, res, next) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) throw new NotFoundError('Application');

    const result = runDiscovery(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/applications/:id/discovery — Get latest discovery results
router.get('/:id/discovery', (req, res, next) => {
  try {
    const result = getDiscovery(req.params.id);
    if (!result) {
      return res.json({ success: true, data: null, message: 'No discovery results found. Run discovery first.' });
    }
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/applications/:id/discovery/retry — Retry discovery
router.post('/:id/discovery/retry', (req, res, next) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) throw new NotFoundError('Application');

    logAudit(req.params.id, 'discovery.retried', 'application', req.params.id);

    const result = runDiscovery(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;