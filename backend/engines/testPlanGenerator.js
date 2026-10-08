const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../middleware/auditLogger');

/**
 * AI Test Plan Generator.
 * Analyzes discovery results and generates tests across 3 categories:
 * Security, Concurrency, Load.
 */

function generateTestPlan(applicationId) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  if (!app) {
    const error = new Error(`Application not found: ${applicationId}`);
    error.statusCode = 404;
    throw error;
  }

  const discovery = db.prepare(
    'SELECT * FROM discovery_results WHERE application_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
  ).get(applicationId, 'completed');
  if (!discovery) {
    const error = new Error('Complete application discovery before generating the test plan.');
    error.statusCode = 400;
    throw error;
  }

  const ts = new Date().toISOString();

  // Archive any existing active plans
  db.prepare("UPDATE test_plans SET status = 'archived' WHERE application_id = ? AND status = 'active'")
    .run(applicationId);

  // Create new plan
  const planId = uuidv4();
  const version = (db.prepare('SELECT MAX(version) as v FROM test_plans WHERE application_id = ?').get(applicationId)?.v || 0) + 1;

  db.prepare('INSERT INTO test_plans (id, application_id, generated_at, status, version) VALUES (?, ?, ?, ?, ?)')
    .run(planId, applicationId, ts, 'active', version);

  const roles = JSON.parse(discovery.roles || '[]');
  const entities = JSON.parse(discovery.entities || '[]');
  const workflows = JSON.parse(discovery.critical_workflows || '[]');
  const endpoints = JSON.parse(discovery.endpoints || '[]');
  const sensitiveFields = JSON.parse(discovery.sensitive_fields || '[]');

  const tests = [];

  // ================================================================
  // SECURITY TESTS
  // ================================================================

  // 1. IDOR / Broken Object-Level Authorization for each entity
  for (const entity of entities) {
    const entityName = typeof entity === 'string' ? entity : entity.name || entity;
    tests.push({
      category: 'security',
      name: `IDOR: Unauthorized Access to ${entityName} Records`,
      description: `Test whether User A can access ${entityName} records belonging to User B by directly manipulating the resource ID in the API request. This tests for Broken Object-Level Authorization (BOLA/IDOR).`,
      severity_estimate: 'CRITICAL',
      affected_component: entityName,
      workflow: 'Object Access',
      safety_level: 'Destructive (if mutations)',
      required_inputs: JSON.stringify({
        user_a_credentials: { type: 'credentials', label: 'User A (attacker) credentials', required: true },
        user_b_resource_id: { type: 'string', label: `User B's ${entityName} resource ID`, required: true },
      }),
    });
  }

  // 2. Authentication bypass
  tests.push({
    category: 'security',
    name: 'Authentication Bypass: Unauthenticated API Access',
    description: 'Attempt to access protected API endpoints without providing authentication credentials. Verifies that all sensitive endpoints require valid authentication.',
    severity_estimate: 'CRITICAL',
    required_inputs: JSON.stringify({
      target_endpoints: { type: 'array', label: 'Protected endpoints to test', required: false },
    }),
  });

  // 3. Sensitive data exposure
  if (sensitiveFields.length > 0) {
    tests.push({
      category: 'security',
      name: 'Sensitive Data Exposure in API Responses',
      description: `Verify that API responses do not leak sensitive fields (${sensitiveFields.slice(0, 3).map(f => f.field || f).join(', ')}, etc.) to unauthorized roles. Check that PII/PHI/PCI data is properly masked or omitted.`,
      severity_estimate: 'HIGH',
      required_inputs: JSON.stringify({
        low_privilege_credentials: { type: 'credentials', label: 'Low-privilege user credentials', required: true },
      }),
    });
  }

  // 4. Rate limiting
  tests.push({
    category: 'security',
    name: 'Rate Limiting Verification',
    description: 'Verify that critical endpoints enforce rate limiting to prevent brute-force attacks, credential stuffing, and API abuse.',
    severity_estimate: 'MEDIUM',
    required_inputs: JSON.stringify({}),
  });

  // 5. Role escalation
  if (roles.length > 1) {
    tests.push({
      category: 'security',
      name: 'Privilege Escalation: Role Boundary Verification',
      description: `Test whether lower-privilege roles (${roles.slice(0, 2).map(r => typeof r === 'string' ? r : r.name).join(', ')}) can access administrative endpoints or perform actions reserved for higher-privilege roles.`,
      severity_estimate: 'CRITICAL',
      required_inputs: JSON.stringify({
        low_role_credentials: { type: 'credentials', label: 'Low-privilege role credentials', required: true },
        admin_endpoints: { type: 'array', label: 'Admin-only endpoints', required: false },
      }),
    });
  }

  // ================================================================
  // CONCURRENCY TESTS
  // ================================================================

  for (const wf of workflows) {
    const wfName = typeof wf === 'string' ? wf : wf.name || wf;
    const wfRisk = typeof wf === 'object' ? wf.risk : 'Race condition';

    tests.push({
      category: 'concurrency',
      name: `Race Condition: ${wfName}`,
      description: `Execute simultaneous requests for "${wfName}" to detect race conditions, double-processing, or data integrity failures. Risk: ${wfRisk}.`,
      severity_estimate: wfName.toLowerCase().includes('payment') || wfName.toLowerCase().includes('book') ? 'CRITICAL' : 'HIGH',
      affected_component: wfName,
      workflow: wfName,
      safety_level: 'High Load / Mutable',
      required_inputs: JSON.stringify({
        concurrency_level: { type: 'number', label: 'Number of simultaneous requests', default: 2, min: 2, max: 20, required: false },
        workflow_payload: { type: 'object', label: `Payload for ${wfName}`, required: true },
      }),
    });
  }

  // Duplicate operation test
  tests.push({
    category: 'concurrency',
    name: 'Duplicate Operation Detection',
    description: 'Submit identical operations in rapid succession to verify that the application correctly rejects or deduplicates duplicate requests (e.g., double payment, double submission).',
    severity_estimate: 'HIGH',
    required_inputs: JSON.stringify({
      operation_endpoint: { type: 'string', label: 'Endpoint to test', required: true },
      operation_payload: { type: 'object', label: 'Request payload', required: true },
    }),
  });

  // ================================================================
  // LOAD TESTS
  // ================================================================

  tests.push({
    category: 'load',
    name: 'Progressive Load Test: API Endpoints',
    description: 'Incrementally increase concurrent users (10 → 25 → 50 → 100 → 250 → 500 → 1000) to identify the degradation point where response times or error rates exceed acceptable thresholds.',
    severity_estimate: 'HIGH',
    required_inputs: JSON.stringify({
      target_endpoint: { type: 'string', label: 'Primary endpoint to test', default: '/api/appointments', required: false },
      max_users: { type: 'number', label: 'Maximum concurrent users', default: 1000, required: false },
      threshold_latency_ms: { type: 'number', label: 'Latency threshold (ms)', default: 1000, required: false },
      threshold_error_rate: { type: 'number', label: 'Error rate threshold (%)', default: 1.0, required: false },
    }),
  });

  tests.push({
    category: 'load',
    name: 'Critical Workflow Load Test',
    description: 'Apply progressive load specifically to critical business workflows (appointment booking, payment processing) to determine if they degrade faster than standard CRUD endpoints.',
    severity_estimate: 'HIGH',
    required_inputs: JSON.stringify({
      workflow: { type: 'string', label: 'Workflow to load test', required: false },
    }),
  });

  tests.push({
    category: 'load',
    name: 'Sustained Load Stability Test',
    description: 'Maintain a steady load at 80% of the identified degradation point for 5 minutes to check for memory leaks, connection pool exhaustion, or progressive degradation under sustained traffic.',
    severity_estimate: 'MEDIUM',
    required_inputs: JSON.stringify({}),
  });

  // ================================================================
  // Insert all tests
  // ================================================================
  const insertTest = db.prepare(`
    INSERT INTO tests (id, test_plan_id, application_id, category, name, description, severity_estimate, affected_component, workflow, safety_level, required_inputs, included, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((testList) => {
    for (const t of testList) {
      insertTest.run(
        uuidv4(), planId, applicationId,
        t.category, t.name, t.description,
        t.severity_estimate, t.affected_component || null, t.workflow || null, t.safety_level || 'Safe', t.required_inputs,
        1, 'pending'
      );
    }
  });

  insertMany(tests);

  logAudit(applicationId, 'test_plan.generated', 'test_plan', planId, { testCount: tests.length, version });

  return getTestPlan(applicationId);
}

/**
 * Get the active test plan for an application with all tests.
 */
function getTestPlan(applicationId) {
  const plan = db.prepare(
    "SELECT * FROM test_plans WHERE application_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1"
  ).get(applicationId);
  if (!plan) return null;

  const tests = db.prepare('SELECT * FROM tests WHERE test_plan_id = ? ORDER BY category, name').all(plan.id);

  // Parse required_inputs JSON
  const parsedTests = tests.map(t => ({
    ...t,
    required_inputs: JSON.parse(t.required_inputs || '{}'),
    inputs: JSON.parse(t.inputs || '{}'),
    included: Boolean(t.included),
  }));

  const summary = {
    total: parsedTests.length,
    included: parsedTests.filter(t => t.included).length,
    excluded: parsedTests.filter(t => !t.included).length,
    require_input: parsedTests.filter(t => {
      const reqInputs = t.required_inputs;
      const savedInputs = t.inputs || {};
      return Object.entries(reqInputs).some(([k, v]) => v.required && !savedInputs[k]);
    }).length,
    by_category: {
      security: parsedTests.filter(t => t.category === 'security').length,
      concurrency: parsedTests.filter(t => t.category === 'concurrency').length,
      load: parsedTests.filter(t => t.category === 'load').length,
    },
  };

  return { plan, tests: parsedTests, summary };
}

module.exports = { generateTestPlan, getTestPlan };