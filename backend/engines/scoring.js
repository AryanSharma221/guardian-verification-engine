const db = require('../db/connection');
const { SCORE_WEIGHTS, SEVERITY_PENALTIES } = require('../utils/constants');

/**
 * Production Readiness Scoring Engine.
 * 
 * Weights:
 *   Security: 30%
 *   Scalability: 25%
 *   Reliability: 20%
 *   Business Logic: 15%
 *   Data Integrity: 10%
 * 
 * CRITICAL OVERRIDE:
 *   If ANY unresolved CRITICAL finding exists → PRODUCTION_BLOCKER
 */

/**
 * Calculate the full readiness score for an application.
 */
function calculateScore(applicationId) {
  // Get all unresolved findings grouped by category and severity
  const findings = db.prepare(`
    SELECT category, severity, COUNT(*) as count
    FROM findings 
    WHERE application_id = ? AND status = 'open'
    GROUP BY category, severity
  `).all(applicationId);

  // Check for any unresolved critical findings
  const unresolvedCriticals = db.prepare(`
    SELECT COUNT(*) as count 
    FROM findings 
    WHERE application_id = ? AND severity = 'CRITICAL' AND status = 'open'
  `).get(applicationId).count;

  // Calculate per-category scores
  const categoryScores = {};
  const categories = ['security', 'scalability', 'reliability', 'business_logic', 'data_integrity'];

  for (const category of categories) {
    let score = 100;
    const categoryFindings = findings.filter(f => f.category === category);

    for (const f of categoryFindings) {
      const penalty = SEVERITY_PENALTIES[f.severity] || 0;
      score -= penalty * f.count;
    }

    categoryScores[category] = Math.max(0, Math.min(100, score));
  }

  // Calculate overall weighted score
  let overallScore = 0;
  for (const [category, weight] of Object.entries(SCORE_WEIGHTS)) {
    overallScore += (categoryScores[category] || 100) * weight;
  }
  overallScore = Math.round(overallScore * 10) / 10; // One decimal

  // Determine readiness status
  let readinessStatus;
  if (unresolvedCriticals > 0) {
    readinessStatus = 'PRODUCTION_BLOCKER';
  } else if (overallScore >= 80) {
    readinessStatus = 'READY';
  } else if (overallScore >= 60) {
    readinessStatus = 'NEEDS_ATTENTION';
  } else {
    readinessStatus = 'HIGH_RISK';
  }

  // Get summary stats
  const totalFindings = db.prepare('SELECT COUNT(*) as count FROM findings WHERE application_id = ?').get(applicationId).count;
  const resolvedFindings = db.prepare("SELECT COUNT(*) as count FROM findings WHERE application_id = ? AND status = 'resolved'").get(applicationId).count;
  const testRuns = db.prepare('SELECT COUNT(*) as count FROM test_runs WHERE application_id = ?').get(applicationId).count;

  const scoreData = {
    overall_score: overallScore,
    readiness_status: readinessStatus,
    category_scores: {
      security: { score: categoryScores.security, weight: '30%', label: 'Security' },
      scalability: { score: categoryScores.scalability, weight: '25%', label: 'Scalability' },
      reliability: { score: categoryScores.reliability, weight: '20%', label: 'Reliability' },
      business_logic: { score: categoryScores.business_logic, weight: '15%', label: 'Business Logic' },
      data_integrity: { score: categoryScores.data_integrity, weight: '10%', label: 'Data Integrity' },
    },
    unresolved_criticals: unresolvedCriticals,
    total_findings: totalFindings,
    resolved_findings: resolvedFindings,
    test_runs: testRuns,
  };

  // Update application record
  db.prepare(`
    UPDATE applications SET readiness_score = ?, readiness_status = ?, updated_at = ?
    WHERE id = ?
  `).run(overallScore, readinessStatus, new Date().toISOString(), applicationId);

  return scoreData;
}

module.exports = { calculateScore };