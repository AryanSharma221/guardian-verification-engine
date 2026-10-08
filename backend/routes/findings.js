const express = require('express');
const router = express.Router({ mergeParams: true });
const { getFindings, getFinding, getFindingsSummary } = require('../engines/findingsEngine');
const { diagnoseFinding } = require('../engines/diagnosis');
const { NotFoundError } = require('../utils/errors');

// GET / — List findings for an application (mounted at /api/applications/:id/findings)
// Also handles GET /api/findings (global)
router.get('/', (req, res, next) => {
  try {
    const appId = req.params.id;
    if (!appId) {
      // Global findings listing — not app-scoped
      return res.json({ success: true, data: [], total: 0, page: 1, pageSize: 20 });
    }

    const filters = {
      severity: req.query.severity || null,
      category: req.query.category || null,
      status: req.query.status || null,
      search: req.query.search || null,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 50,
    };

    const result = getFindings(appId, filters);
    res.json({
      success: true,
      data: result.findings,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (err) { next(err); }
});

// GET /summary — Findings summary stats
router.get('/summary', (req, res, next) => {
  try {
    const appId = req.params.id;
    if (!appId) throw new NotFoundError('Application');
    const summary = getFindingsSummary(appId);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

// GET /:id — Get single finding with full details
router.get('/:id', (req, res, next) => {
  try {
    // When mounted at /api/findings/:id, the findingId is in req.params.id
    const findingId = req.params.id;
    const finding = getFinding(findingId);
    if (!finding) throw new NotFoundError('Finding');
    res.json({ success: true, data: finding });
  } catch (err) { next(err); }
});

// POST /:id/diagnose — Run AI diagnosis on a finding
router.post('/:id/diagnose', (req, res, next) => {
  try {
    const result = diagnoseFinding(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;