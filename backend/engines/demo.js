const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../middleware/auditLogger');
const { runDiscovery } = require('./discovery');
const { generateTestPlan } = require('./testPlanGenerator');
const { runAuthorizationTests } = require('./authorization');
const { runConcurrencyTests } = require('./concurrency');
const { runLoadTests } = require('./load');
const { diagnoseFinding } = require('./diagnosis');
const { calculateScore } = require('./scoring');

/**
 * Demo Engine — orchestrates the complete MediFlow demo flow.
 * 
 * Demonstrates:
 * 1. IDOR / authorization failure
 * 2. Appointment double-booking race condition  
 * 3. Progressive load degradation
 * 4. AI diagnosis
 * 5. Proposed remediation
 * 6. Retest
 * 7. Improved score
 */

/**
 * Run the full demo flow for an application.
 */
function runFullDemo(applicationId) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  if (!app) throw new Error('Application not found');

  const ts = new Date().toISOString();

  // 1. Run discovery (creates MediFlow demo data)
  const discoveryResult = runDiscovery(applicationId);

  // 2. Generate test plan from discovery data
  const testPlanResult = generateTestPlan(applicationId);

  // 3. Run authorization tests (creates IDOR finding)
  const authResult = runAuthorizationTests(applicationId);

  // 4. Run concurrency tests (creates double-booking finding)
  const concurrencyResult = runConcurrencyTests(applicationId, {
    concurrency: 2,
    workflow: 'Book Appointment',
  });

  // 5. Run load tests (creates degradation finding)
  const loadResult = runLoadTests(applicationId, {
    max_users: 1000,
    threshold_latency_ms: 1000,
    threshold_error_rate: 1.0,
  });

  // 6. Generate AI diagnosis for all findings
  const findings = db.prepare("SELECT id FROM findings WHERE application_id = ? AND status = 'open'").all(applicationId);
  const diagnoses = [];
  for (const f of findings) {
    try {
      const diagnosis = diagnoseFinding(f.id);
      diagnoses.push(diagnosis);
    } catch (e) {
      diagnoses.push({ finding_id: f.id, status: 'ANALYSIS_INCOMPLETE', error: e.message });
    }
  }

  // 7. Calculate initial score (should be PRODUCTION_BLOCKER due to critical findings)
  const score = calculateScore(applicationId);

  // Update app status
  db.prepare("UPDATE applications SET status = 'tested', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), applicationId);

  return {
    application_id: applicationId,
    demo_mode: true,
    steps_completed: {
      discovery: !!discoveryResult,
      test_plan: !!testPlanResult,
      authorization_tests: !!authResult,
      concurrency_tests: !!concurrencyResult,
      load_tests: !!loadResult,
      diagnoses: diagnoses.length,
      score_calculated: true,
    },
    results: {
      discovery: { status: 'completed', simulated: true },
      test_plan: testPlanResult ? { id: testPlanResult.plan.id, test_count: testPlanResult.summary.total } : null,
      authorization: {
        run_id: authResult.run_id,
        critical_findings: authResult.results.filter(r => r.finding?.severity === 'CRITICAL').length,
      },
      concurrency: {
        run_id: concurrencyResult.run_id,
        critical_findings: concurrencyResult.results.filter(r => r.finding?.severity === 'CRITICAL').length,
      },
      load: {
        run_id: loadResult.run_id,
        degradation_point: loadResult.degradation_point,
      },
    },
    score,
  };
}

/**
 * Simulate a retest that resolves a finding and improves the score.
 */
function runDemoRetest(findingId) {
  const finding = db.prepare('SELECT * FROM findings WHERE id = ?').get(findingId);
  if (!finding) throw new Error('Finding not found');

  const ts = new Date().toISOString();
  const scoreBefore = calculateScore(finding.application_id);

  // Get original evidence
  const originalEvidence = db.prepare('SELECT * FROM evidence WHERE finding_id = ? LIMIT 1').get(findingId);

  // Create retest record
  const retestId = uuidv4();

  logAudit(finding.application_id, 'retest.started', 'finding', findingId);

  // Simulate the fix being applied and the retest passing
  let newResult, afterEvidence;

  if (finding.category === 'security') {
    newResult = {
      status: 'passed',
      description: 'Authorization check now correctly returns 403 Forbidden for unauthorized access attempts.',
      actual_result: '403 Forbidden — Access Denied',
      expected_result: '403 Forbidden — Access Denied',
    };
    afterEvidence = {
      endpoint: JSON.parse(finding.evidence || '{}').endpoint || 'GET /api/patients/:id',
      actual_status: 403,
      expected_status: 403,
      response_body: { error: 'Access denied. You do not have permission to access this resource.' },
      fix_applied: 'Added ownership verification middleware to patient endpoints',
    };
  } else if (finding.category === 'business_logic') {
    newResult = {
      status: 'passed',
      description: 'Concurrent booking requests now properly use database-level locking. Second request correctly returns 409 Conflict.',
      actual_result: 'Only 1 booking succeeded; second request returned 409 Conflict',
      expected_result: 'Only 1 booking should succeed',
    };
    afterEvidence = {
      concurrent_requests: 2,
      results: [
        { request: 1, status: 201, result: 'Booking confirmed' },
        { request: 2, status: 409, result: 'Conflict — slot no longer available' },
      ],
      fix_applied: 'Added SELECT FOR UPDATE locking on appointment slot before booking',
    };
  } else if (finding.category === 'scalability') {
    newResult = {
      status: 'passed',
      description: 'After optimization, the application now maintains acceptable performance up to 500 concurrent users.',
      actual_result: '500 users → 99.2% success rate, 420ms avg latency',
      expected_result: 'Maintain <1000ms latency and <1% error rate',
    };
    afterEvidence = {
      optimizations_applied: ['Added Redis caching', 'Optimized database indexes', 'Implemented connection pooling'],
      degradation_point: { concurrent_users: 1000, avg_latency: 980, error_rate: 2.1 },
      improvement: 'Degradation point moved from 250 to 1000 users',
    };
  } else {
    newResult = {
      status: 'passed',
      description: 'Issue has been resolved after applying the recommended fix.',
      actual_result: 'Test passed successfully',
      expected_result: 'Test should pass',
    };
    afterEvidence = { fix_applied: 'Recommended fix was applied', verified: true };
  }

  // Insert retest
  db.prepare(`
    INSERT INTO retests (id, finding_id, original_result, new_result, status, score_before, before_evidence, after_evidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    retestId, findingId,
    JSON.stringify({ status: 'failed', original_finding: finding.title }),
    JSON.stringify(newResult),
    'passed',
    scoreBefore.overall_score,
    JSON.stringify(originalEvidence ? {
      request: JSON.parse(originalEvidence.request || '{}'),
      response: JSON.parse(originalEvidence.response || '{}'),
      status_code: originalEvidence.status_code,
    } : {}),
    JSON.stringify(afterEvidence),
    ts
  );

  // Resolve the finding
  db.prepare("UPDATE findings SET status = 'resolved', resolved_at = ? WHERE id = ?")
    .run(ts, findingId);

  logAudit(finding.application_id, 'finding.resolved', 'finding', findingId);

  // Recalculate score
  const scoreAfter = calculateScore(finding.application_id);

  // Update retest with new score
  db.prepare('UPDATE retests SET score_after = ? WHERE id = ?')
    .run(scoreAfter.overall_score, retestId);

  logAudit(finding.application_id, 'retest.completed', 'retest', retestId, {
    result: 'passed',
    score_before: scoreBefore.overall_score,
    score_after: scoreAfter.overall_score,
  });

  return {
    retest_id: retestId,
    finding_id: findingId,
    status: 'passed',
    original_result: { status: 'failed', finding_title: finding.title, finding_severity: finding.severity },
    new_result: newResult,
    before_evidence: originalEvidence ? JSON.parse(originalEvidence.request || '{}') : {},
    after_evidence: afterEvidence,
    score_before: scoreBefore.overall_score,
    score_after: scoreAfter.overall_score,
    readiness_status_before: scoreBefore.readiness_status,
    readiness_status_after: scoreAfter.readiness_status,
    is_simulated: true,
  };
}

module.exports = { runFullDemo, runDemoRetest };
