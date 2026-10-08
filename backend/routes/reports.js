const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const { calculateScore } = require('../engines/scoring');
const { getFindings, getFindingsSummary } = require('../engines/findingsEngine');

// POST /generate — Generate a comprehensive report
router.post('/generate', (req, res, next) => {
  try {
    const appId = req.params.id;
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
    if (!app) return res.status(404).json({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' } });

    // Calculate current score
    const scoreData = calculateScore(appId);

    // Get findings by severity
    const allFindings = db.prepare('SELECT * FROM findings WHERE application_id = ? ORDER BY CASE severity WHEN \'CRITICAL\' THEN 1 WHEN \'HIGH\' THEN 2 WHEN \'MEDIUM\' THEN 3 WHEN \'LOW\' THEN 4 ELSE 5 END')
      .all(appId)
      .map(f => ({ ...f, evidence: JSON.parse(f.evidence || '{}') }));

    const criticalFindings = allFindings.filter(f => f.severity === 'CRITICAL' && f.status === 'open');
    const resolvedFindings = allFindings.filter(f => f.status === 'resolved');

    // Get test runs
    const testRuns = db.prepare('SELECT * FROM test_runs WHERE application_id = ? ORDER BY started_at DESC LIMIT 10')
      .all(appId)
      .map(r => ({ ...r, summary: JSON.parse(r.summary || '{}') }));

    // Get retests
    const retests = db.prepare(`
      SELECT r.* FROM retests r 
      JOIN findings f ON r.finding_id = f.id 
      WHERE f.application_id = ? ORDER BY r.created_at DESC
    `).all(appId).map(r => ({
      ...r,
      original_result: JSON.parse(r.original_result || '{}'),
      new_result: JSON.parse(r.new_result || '{}'),
    }));

    // Build recommendations
    const recommendations = [];
    if (criticalFindings.length > 0) {
      recommendations.push('URGENT: Resolve all critical findings before production deployment.');
    }
    for (const f of criticalFindings) {
      recommendations.push(`Fix: ${f.title} — ${f.recommendation || 'See finding details for remediation steps.'}`);
    }
    const highFindings = allFindings.filter(f => f.severity === 'HIGH' && f.status === 'open');
    if (highFindings.length > 0) {
      recommendations.push(`Address ${highFindings.length} high-severity finding(s) to improve readiness score.`);
    }

    // Determine readiness decision
    let readinessDecision;
    if (scoreData.readiness_status === 'PRODUCTION_BLOCKER') {
      readinessDecision = 'NOT READY — Critical findings must be resolved before production deployment.';
    } else if (scoreData.readiness_status === 'READY') {
      readinessDecision = 'READY — Application meets production readiness criteria.';
    } else if (scoreData.readiness_status === 'NEEDS_ATTENTION') {
      readinessDecision = 'CONDITIONAL — Application requires attention on identified issues before production deployment.';
    } else {
      readinessDecision = 'NOT READY — Application has significant risks that must be addressed.';
    }

    const report = {
      generated_at: new Date().toISOString(),
      application: { id: app.id, name: app.name, description: app.description, base_url: app.base_url },
      executive_summary: `Guardian analyzed ${app.name} and identified ${allFindings.length} finding(s) across ${testRuns.length} test run(s). ${criticalFindings.length} critical finding(s) remain unresolved. Overall readiness score: ${scoreData.overall_score}/100 (${scoreData.readiness_status}).`,
      overall_score: scoreData.overall_score,
      readiness_status: scoreData.readiness_status,
      category_scores: scoreData.category_scores,
      critical_findings: criticalFindings,
      all_findings: allFindings,
      resolved_findings: resolvedFindings,
      test_runs: testRuns,
      retests,
      recommendations,
      readiness_decision: readinessDecision,
      is_simulated: testRuns.some(r => r.is_simulated),
    };

    const reportId = require('uuid').v4();
    db.prepare(`
      INSERT INTO reports (id, application_id, report_data, overall_score, readiness_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reportId, appId, JSON.stringify(report), scoreData.overall_score, scoreData.readiness_status, report.generated_at);
    
    report.id = reportId;

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// GET / — List reports for application
router.get('/', (req, res, next) => {
  try {
    const appId = req.params.id;
    const reports = db.prepare('SELECT id, application_id, overall_score, readiness_status, created_at FROM reports WHERE application_id = ? ORDER BY created_at DESC').all(appId);
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
});

// GET /:reportId — Get a specific report
router.get('/:reportId', (req, res, next) => {
  try {
    const reportId = req.params.reportId;
    const reportRow = db.prepare('SELECT * FROM reports WHERE id = ? AND application_id = ?').get(reportId, req.params.id);
    if (!reportRow) return res.status(404).json({ success: false, error: { message: 'Report not found.' } });
    
    const report = JSON.parse(reportRow.report_data);
    report.id = reportRow.id;
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

module.exports = router;