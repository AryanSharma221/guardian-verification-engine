const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../middleware/auditLogger');
const { runAuthorizationTests } = require('./authorization');
const { runConcurrencyTests } = require('./concurrency');
const { runLoadTests } = require('./load');

// Async delay helper
const delay = ms => new Promise(res => setTimeout(res, ms));

async function startTestRun(applicationId) {
  const plan = db.prepare("SELECT * FROM test_plans WHERE application_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1").get(applicationId);
  if (!plan) throw new Error('No active test plan found');

  const testsToRun = db.prepare('SELECT * FROM tests WHERE test_plan_id = ? AND included = 1').all(plan.id);
  if (testsToRun.length === 0) throw new Error('No tests selected in the plan');

  const runId = uuidv4();
  const ts = new Date().toISOString();

  // Create the run in PENDING status
  db.prepare(`
    INSERT INTO test_runs (id, application_id, test_plan_id, profile, status, started_at, is_simulated, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(runId, applicationId, plan.id, 'Full Suite', 'PENDING', ts, 1, JSON.stringify({
    total_tests: testsToRun.length,
    completed: 0,
    remaining: testsToRun.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    critical: 0,
    progress_percentage: 0,
    current_test: 'Initializing...',
    elapsed_time: '00:00'
  }));

  // Execute asynchronously (fire and forget)
  executeRunInBackground(runId, applicationId, testsToRun);

  return { id: runId, status: 'PENDING' };
}

async function executeRunInBackground(runId, applicationId, testsToRun) {
  const startTime = Date.now();
  let passed = 0, failed = 0, blocked = 0, critical = 0;
  
  const updateSummary = (newStatus, currentTestName = '') => {
    const elapsedMs = Date.now() - startTime;
    const mins = Math.floor(elapsedMs / 60000).toString().padStart(2, '0');
    const secs = Math.floor((elapsedMs % 60000) / 1000).toString().padStart(2, '0');
    const completed = passed + failed + blocked;
    
    // Check current status so we don't overwrite user's pause/stop
    const currentStatus = db.prepare('SELECT status FROM test_runs WHERE id = ?').get(runId)?.status;
    let finalStatus = newStatus;
    if (currentStatus && (currentStatus.toLowerCase() === 'paused' || currentStatus.toLowerCase() === 'stopped') && newStatus === 'RUNNING') {
       finalStatus = currentStatus;
    }
    
    db.prepare("UPDATE test_runs SET status = ?, summary = ? WHERE id = ?").run(
      finalStatus, 
      JSON.stringify({
        total_tests: testsToRun.length,
        completed,
        remaining: testsToRun.length - completed,
        passed, failed, blocked, critical,
        progress_percentage: Math.round((completed / testsToRun.length) * 100),
        current_test: currentTestName,
        elapsed_time: `${mins}:${secs}`
      }),
      runId
    );
  };

  // Start executing
  updateSummary('RUNNING', 'Starting...');

  for (let i = 0; i < testsToRun.length; i++) {
    const test = testsToRun[i];

    // Check status before executing (for pause/stop)
    let runState;
    while (true) {
      runState = db.prepare('SELECT status FROM test_runs WHERE id = ?').get(runId)?.status;
      if (runState === 'paused' || runState === 'PAUSED') {
         updateSummary('PAUSED', 'Execution paused by user');
         await delay(2000); // Poll every 2s while paused
         continue;
      }
      break;
    }
    
    if (runState === 'stopped' || runState === 'STOPPED') {
       db.prepare("UPDATE test_runs SET status = 'INCOMPLETE', completed_at = ? WHERE id = ?").run(new Date().toISOString(), runId);
       return; // Abort completely
    }

    // Mark current test
    updateSummary('RUNNING', test.name);

    // Simulate work/execution time (this gives the UI time to show progress)
    await delay(2000);

    const ts = new Date().toISOString();
    const resultId = uuidv4();
    
    // Some basic mapping based on category since we can't reliably call the complex demo engines for every individual micro-test
    // without passing all the complex payloads. We will simulate individual passes/fails.
    const isCritical = test.severity_estimate === 'CRITICAL';
    const failChance = isCritical ? 0.4 : 0.1; // 40% chance critical tests fail for demo
    const didFail = Math.random() < failChance;

    if (didFail) {
      failed++;
      if (isCritical) critical++;
      
      const evidence = {
         request: `GET ${test.affected_component || '/api/resource'}\nHost: api.mediflow.com`,
         response: `HTTP/1.1 500 Internal Server Error\n\nData corrupted.`,
         status_code: 500,
         timestamp: ts,
         latency: Math.floor(Math.random() * 200) + 50
      };

      db.prepare(`
        INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(resultId, runId, test.id, 'failed', 'Operation succeeds safely', JSON.stringify(evidence), test.severity_estimate, ts, ts);

      // Create finding
      db.prepare(`
        INSERT INTO findings (id, application_id, test_run_id, test_result_id, category, severity, title, description, evidence, status, is_simulated, created_at, component, workflow)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), applicationId, runId, resultId, test.category, test.severity_estimate, test.name, test.description, JSON.stringify(evidence), 'open', 1, ts, test.affected_component || '', test.workflow || '');

    } else {
      passed++;
      const evidence = {
         request: `GET ${test.affected_component || '/api/resource'}\nHost: api.mediflow.com`,
         response: `HTTP/1.1 200 OK\n\n{"status":"success"}`,
         status_code: 200,
         timestamp: ts,
         latency: Math.floor(Math.random() * 50) + 10
      };

      db.prepare(`
        INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(resultId, runId, test.id, 'passed', 'Operation succeeds safely', JSON.stringify(evidence), 'INFO', ts, ts);
    }

    updateSummary('RUNNING', test.name);
  }

  // Done
  const finalScore = critical > 0 ? 0 : (failed > 0 ? 50 : 100);
  db.prepare("UPDATE test_runs SET status = 'COMPLETED', completed_at = ?, score = ? WHERE id = ?").run(new Date().toISOString(), finalScore, runId);
  updateSummary('COMPLETED', 'All tests complete');
}

module.exports = { startTestRun };
