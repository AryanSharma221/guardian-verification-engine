const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * Findings Engine.
 * Converts test results into actionable findings.
 * Also provides query/filter methods for findings.
 */

/**
 * Get findings for an application with filtering and pagination.
 */
function getFindings(applicationId, filters = {}) {
  let query = 'SELECT * FROM findings WHERE application_id = ?';
  const params = [applicationId];

  if (filters.severity) {
    query += ' AND severity = ?';
    params.push(filters.severity);
  }
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  // Count total before pagination
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params).total;

  // Order and paginate
  query += ' ORDER BY CASE severity WHEN \'CRITICAL\' THEN 1 WHEN \'HIGH\' THEN 2 WHEN \'MEDIUM\' THEN 3 WHEN \'LOW\' THEN 4 ELSE 5 END, created_at DESC';

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  query += ' LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const findings = db.prepare(query).all(...params).map(f => ({
    ...f,
    evidence: JSON.parse(f.evidence || '{}'),
  }));

  return { findings, total, page, pageSize };
}

/**
 * Get a single finding by ID with full details.
 */
function getFinding(findingId) {
  const finding = db.prepare('SELECT * FROM findings WHERE id = ?').get(findingId);
  if (!finding) return null;

  finding.evidence = JSON.parse(finding.evidence || '{}');

  // Get related evidence records
  const evidenceRecords = db.prepare('SELECT * FROM evidence WHERE finding_id = ?').all(findingId).map(e => ({
    ...e,
    request: JSON.parse(e.request || '{}'),
    response: JSON.parse(e.response || '{}'),
    test_configuration: JSON.parse(e.test_configuration || '{}'),
    execution_timeline: JSON.parse(e.execution_timeline || '[]'),
  }));

  // Get related remediation
  const remediation = db.prepare('SELECT * FROM remediations WHERE finding_id = ? ORDER BY created_at DESC LIMIT 1').get(findingId);

  // Get related retests
  const retests = db.prepare('SELECT * FROM retests WHERE finding_id = ? ORDER BY created_at DESC').all(findingId).map(r => ({
    ...r,
    original_result: JSON.parse(r.original_result || '{}'),
    new_result: JSON.parse(r.new_result || '{}'),
    before_evidence: JSON.parse(r.before_evidence || '{}'),
    after_evidence: JSON.parse(r.after_evidence || '{}'),
  }));

  return {
    ...finding,
    evidence_records: evidenceRecords,
    remediation,
    retests,
  };
}

/**
 * Get summary statistics for findings.
 */
function getFindingsSummary(applicationId) {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN severity = 'LOW' THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN severity = 'INFORMATIONAL' THEN 1 ELSE 0 END) as informational,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
    FROM findings WHERE application_id = ?
  `).get(applicationId);

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count
    FROM findings WHERE application_id = ? GROUP BY category
  `).all(applicationId);

  return { ...stats, by_category: byCategory };
}

module.exports = { getFindings, getFinding, getFindingsSummary };