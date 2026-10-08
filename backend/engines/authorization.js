const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { logAudit } = require('../middleware/auditLogger');

function runAuthorizationTests(applicationId, plan = null) {
  const ts = new Date().toISOString();

  // Create test run
  const runId = uuidv4();
  db.prepare(`
    INSERT INTO test_runs (id, application_id, test_plan_id, profile, status, started_at, is_simulated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(runId, applicationId, plan?.id || null, 'authorization', 'running', ts, 1);

  logAudit(applicationId, 'test_run.started', 'test_run', runId, { profile: 'authorization' });
  db.prepare("UPDATE applications SET status = 'testing', updated_at = ? WHERE id = ?").run(ts, applicationId);

  const results = [];
  let criticalFound = false;

  // Test 1: User A accessing User B's records — VULNERABLE
  const test1Id = uuidv4();
  const result1 = simulateIDOR_UserRecords(runId, test1Id, applicationId, ts);
  results.push(result1);
  if (result1.finding) criticalFound = true;

  // Test 2: User accessing Manager-only reports — VULNERABLE
  const test2Id = uuidv4();
  const result2 = simulateIDOR_AdminReports(runId, test2Id, applicationId, ts);
  results.push(result2);
  if (result2.finding) criticalFound = true;

  // Test 3: Guest accessing internal API — BLOCKED
  const test3Id = uuidv4();
  const result3 = simulateUnauthenticatedAccess(runId, test3Id, applicationId, ts);
  results.push(result3);

  // Complete run
  const summary = { total: 3, passed: 1, failed: 2, critical_findings: criticalFound ? 2 : 0 };
  const score = criticalFound ? 0 : 100;
  
  db.prepare(`
    UPDATE test_runs SET status = 'completed', completed_at = ?, score = ?, summary = ? WHERE id = ?
  `).run(ts, score, JSON.stringify(summary), runId);

  logAudit(applicationId, 'test_run.completed', 'test_run', runId, { score });
  
  return { id: runId, status: 'completed', score, results };
}

function simulateIDOR_UserRecords(runId, testId, applicationId, ts) {
  const resultId = uuidv4();
  
  // Create evidence data
  const evidenceData = {
    endpoint: 'GET /api/users/user-b-002',
    request_headers: { Authorization: 'Bearer eyJ...user-a-token', 'Content-Type': 'application/json' },
    expected_status: 403,
    actual_status: 200,
    response_body: {
      id: 'user-b-002',
      name: 'Bob Martinez',
      tax_id: '***-**-4532',
      date_of_birth: '1985-03-15',
      financial_history: ['Late Payment', 'Overdraft'],
      bank_account: 'INS-9982341',
      transactions: [{ id: 'tx-221', date: '2024-01-15', manager: 'Alice Smith' }],
    },
  };

  const findingId = uuidv4();
  db.prepare(`
    INSERT INTO findings (id, application_id, test_run_id, test_result_id, category, severity, title, description, evidence, impact, root_cause, recommendation, confidence, status, is_simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    findingId, applicationId, runId, resultId,
    'security', 'CRITICAL',
    'Broken Object-Level Authorization: Unauthorized User Record Access',
    'User A was able to access User B\'s complete confidential record by directly requesting GET /api/users/user-b-002 with User A\'s authentication token. The server returned a 200 OK response with User B\'s full record including Tax ID, financial history, and banking information. No ownership verification was performed on the server side.',
    JSON.stringify(evidenceData),
    'Any authenticated user can access any other user\'s protected data (PII) by enumerating or guessing user IDs. This constitutes a GDPR/compliance violation and exposes the organization to significant regulatory and legal liability.',
    'The API endpoint GET /api/users/:id does not verify that the requesting user owns or has authorized access to the requested record. The server only checks that the request contains a valid authentication token but does not enforce object-level authorization.',
    'Implement object-level authorization checks on all user-related endpoints. Before returning any sensitive data, verify that the authenticated user\'s ID matches the requested user ID, or that the user has an explicit authorization relationship (e.g., assigned manager). Example: if (req.user.id !== req.params.userId && !isAssignedManager(req.user.id, req.params.userId)) return res.status(403).json({ error: "Access denied" });',
    'observed',
    'open', 1, ts
  );

  const evidenceId = uuidv4();
  db.prepare(`
    INSERT INTO evidence (id, finding_id, test_result_id, request, response, status_code, timestamp, latency, test_configuration, execution_timeline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evidenceId, findingId, resultId,
    JSON.stringify({ method: 'GET', url: '/api/users/user-b-002', headers: { Authorization: 'Bearer eyJ...user-a-token' } }),
    JSON.stringify({ status: 200, body: evidenceData.response_body }),
    200, ts, 45,
    JSON.stringify({ actor: 'User A', target: 'User B', bypass_technique: 'IDOR / Parameter Tampering' }),
    JSON.stringify([
      { t: 0, action: 'Authenticate as User A', result: 'Success (Token received)' },
      { t: 15, action: 'Request User B record', result: 'Request dispatched' },
      { t: 60, action: 'Response received', result: '200 OK (Data exposed)' }
    ])
  );

  db.prepare(`
    INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, summary, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    resultId, runId, testId, 'failed',
    'Server should return 403 Forbidden or 404 Not Found',
    'Server returned 200 OK with User B\'s PII',
    'CRITICAL',
    JSON.stringify({ bypass: true, data_exposed: true }),
    ts, ts
  );

  return { test_id: testId, status: 'failed', finding: { id: findingId, title: 'Broken Object-Level Authorization: Unauthorized User Record Access', severity: 'CRITICAL' } };
}

function simulateIDOR_AdminReports(runId, testId, applicationId, ts) {
  const resultId = uuidv4();
  
  const evidenceData = {
    endpoint: 'GET /api/reports/system-financials-2024',
    request_headers: { Authorization: 'Bearer eyJ...standard-user-token', 'Content-Type': 'application/json' },
    expected_status: 403,
    actual_status: 200,
    response_body: {
      report_id: 'system-financials-2024',
      type: 'financial_summary',
      revenue: '$4,250,000',
      status: 'CONFIDENTIAL',
    },
  };

  const findingId = uuidv4();
  db.prepare(`
    INSERT INTO findings (id, application_id, test_run_id, test_result_id, category, severity, title, description, evidence, impact, root_cause, recommendation, confidence, status, is_simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    findingId, applicationId, runId, resultId,
    'security', 'HIGH',
    'Role-Based Access Bypass: User Accessing Manager-Only Reports',
    'A standard user was able to access a confidential system report intended only for Managers/Admins by modifying the report ID in the URL. The system did not enforce function-level or role-based authorization.',
    JSON.stringify(evidenceData),
    'Confidential operational data can be accessed by any authenticated user, leading to significant internal data leaks.',
    'The endpoint relies solely on UI-level hiding of the report link. When the API is called directly, the controller does not verify if req.user.role === "Manager".',
    'Enforce role-based access control (RBAC) at the route middleware or controller level. Ensure every sensitive endpoint validates both authentication (who are you) AND authorization (are you allowed to do this).',
    'observed',
    'open', 1, ts
  );

  const evidenceId = uuidv4();
  db.prepare(`
    INSERT INTO evidence (id, finding_id, test_result_id, request, response, status_code, timestamp, latency, test_configuration, execution_timeline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evidenceId, findingId, resultId,
    JSON.stringify({ method: 'GET', url: '/api/reports/system-financials-2024', headers: { Authorization: 'Bearer eyJ...standard-user-token' } }),
    JSON.stringify({ status: 200, body: evidenceData.response_body }),
    200, ts, 62,
    JSON.stringify({ actor: 'Standard User', target: 'Confidential Report', bypass_technique: 'BFLA / Direct Object Reference' }),
    JSON.stringify([
      { t: 0, action: 'Authenticate as Standard User', result: 'Success' },
      { t: 20, action: 'Request /api/reports/system-financials-2024', result: 'Dispatched' },
      { t: 82, action: 'Response received', result: '200 OK (Confidential data exposed)' }
    ])
  );

  db.prepare(`
    INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, summary, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    resultId, runId, testId, 'failed',
    'Server should return 403 Forbidden',
    'Server returned 200 OK with report data',
    'HIGH',
    JSON.stringify({ bypass: true, data_exposed: true }),
    ts, ts
  );

  return { test_id: testId, status: 'failed', finding: { id: findingId, title: 'Role-Based Access Bypass: User Accessing Manager-Only Reports', severity: 'HIGH' } };
}

function simulateUnauthenticatedAccess(runId, testId, applicationId, ts) {
  const resultId = uuidv4();
  
  db.prepare(`
    INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, summary, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    resultId, runId, testId, 'passed',
    'Server should return 401 Unauthorized',
    'Server returned 401 Unauthorized',
    null,
    JSON.stringify({ bypass: false, data_exposed: false }),
    ts, ts
  );

  return { test_id: testId, status: 'passed' };
}

module.exports = {
  runAuthorizationTests
};