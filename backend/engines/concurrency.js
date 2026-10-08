const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { logAudit } = require('../middleware/auditLogger');

function runConcurrencyTests(applicationId, options = {}, plan = null) {
  const ts = new Date().toISOString();
  
  // 1. Safety Check
  const safety = db.prepare('SELECT max_concurrency FROM safety_settings WHERE application_id = ?').get(applicationId);
  const maxConcurrency = safety ? safety.max_concurrency : 10;
  const requestedConcurrency = parseInt(options.concurrency) || 2;
  
  if (requestedConcurrency > maxConcurrency) {
    const err = new Error(`Blocked by configured rate limit. Max concurrency allowed is ${maxConcurrency}.`);
    err.statusCode = 429;
    throw err;
  }

  // Create test run
  const runId = uuidv4();
  db.prepare(`
    INSERT INTO test_runs (id, application_id, test_plan_id, profile, status, started_at, is_simulated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(runId, applicationId, plan?.id || null, 'concurrency', 'running', ts, 1);

  logAudit(applicationId, 'test_run.started', 'test_run', runId, { profile: 'concurrency', options });
  db.prepare("UPDATE applications SET status = 'testing', updated_at = ? WHERE id = ?").run(ts, applicationId);

  const workflowName = options.workflow || 'Unknown Workflow';
  // Check if it's a safe pass (e.g., test configuration requested safe mode, or maybe specific workflows)
  const isSafe = options.safe === true;
  
  const resultId = uuidv4();
  
  let evidenceData;
  let criticalFound = false;

  if (isSafe) {
    // Safe Pass Scenario
    evidenceData = {
      initial_state: { available_slots: 1, active_transactions: 0 },
      requests_sent: requestedConcurrency,
      successful_responses: 1,
      failed_responses: requestedConcurrency - 1,
      final_state: { available_slots: 0, active_transactions: 1 },
      timeline: []
    };
    
    // Generate timeline
    for (let i=0; i<requestedConcurrency; i++) {
      evidenceData.timeline.push({ t: i, action: `Read State (Req ${i})`, state_read: 'slots=1' });
    }
    evidenceData.timeline.push({ t: 15, action: `Write State (Req 0)`, new_state: 'slots=0', status: 'success' });
    for (let i=1; i<requestedConcurrency; i++) {
      evidenceData.timeline.push({ t: 15 + i, action: `Write State (Req ${i})`, new_state: 'REJECTED_LOCK', status: 'failed' });
    }
    
    db.prepare(`
      INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(resultId, runId, null, 'passed', 'Concurrency protection works', JSON.stringify(evidenceData), 'INFO', ts, ts);

  } else {
    // Race Condition Scenario
    criticalFound = true;
    evidenceData = {
      initial_state: { available_slots: 1, active_transactions: 0 },
      requests_sent: requestedConcurrency,
      successful_responses: 2, 
      failed_responses: requestedConcurrency - 2,
      final_state: { available_slots: -1, active_transactions: 2 },
      timeline: [
        { t: 0, action: 'Read State (Req A)', state_read: 'slots=1', status: 'success' },
        { t: 2, action: 'Read State (Req B)', state_read: 'slots=1', status: 'success' },
        { t: 15, action: 'Write State (Req A)', new_state: 'slots=0', status: 'success' },
        { t: 18, action: 'Write State (Req B)', new_state: 'slots=-1', status: 'success' },
      ]
    };
    
    // Fill the rest if concurrency > 2
    for(let i=2; i<requestedConcurrency; i++) {
       evidenceData.timeline.push({ t: 20+i, action: `Write State (Req ${i})`, new_state: 'REJECTED', status: 'failed' });
    }

    db.prepare(`
      INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(resultId, runId, null, 'failed', 'Prevent double booking', JSON.stringify(evidenceData), 'CRITICAL', ts, ts);

    const findingId = uuidv4();
    db.prepare(`
      INSERT INTO findings (id, application_id, test_run_id, test_result_id, category, severity, title, description, evidence, impact, root_cause, recommendation, confidence, status, is_simulated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      findingId, applicationId, runId, resultId,
      'concurrency', 'CRITICAL', 'Double booking detected',
      `2 requests successfully completed an operation that should have allowed only 1 reservation in workflow "${workflowName}".`,
      JSON.stringify(evidenceData),
      'Data integrity failure, double spending, or overbooking.',
      'Lack of pessimistic/optimistic locking during concurrent writes.',
      'Implement database locking (e.g., SELECT FOR UPDATE) or optimistic concurrency control using version columns.',
      0.99, 'open', 1, ts
    );
  }

  const summary = { total: 1, passed: isSafe ? 1 : 0, failed: isSafe ? 0 : 1, critical_findings: criticalFound ? 1 : 0 };
  const score = criticalFound ? 0 : 100;
  
  db.prepare(`
    UPDATE test_runs SET status = 'completed', completed_at = ?, score = ?, summary = ? WHERE id = ?
  `).run(ts, score, JSON.stringify(summary), runId);

  logAudit(applicationId, 'test_run.completed', 'test_run', runId, { score });
  
  return { id: runId, status: 'completed', score, results: [{ id: resultId, finding: criticalFound, evidence: evidenceData }] };
}

module.exports = {
  runConcurrencyTests
};