const db = require('./connection');

/**
 * Creates all tables, indexes, and triggers for the Guardian database.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
function setupDatabase() {
  db.exec(`
    -- ============================================================
    -- APPLICATIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      base_url TEXT DEFAULT '',
      api_spec TEXT DEFAULT '',
      status TEXT DEFAULT 'created',
      readiness_score REAL DEFAULT NULL,
      readiness_status TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- ============================================================
    -- DISCOVERY RESULTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS discovery_results (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      pages TEXT DEFAULT '[]',
      endpoints TEXT DEFAULT '[]',
      forms TEXT DEFAULT '[]',
      roles TEXT DEFAULT '[]',
      entities TEXT DEFAULT '[]',
      sensitive_fields TEXT DEFAULT '[]',
      critical_workflows TEXT DEFAULT '[]',
      confidence_scores TEXT DEFAULT '{}',
      is_simulated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- APPLICATION ROLES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS application_roles (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- APPLICATION ENTITIES
    -- ============================================================
    CREATE TABLE IF NOT EXISTS application_entities (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT '',
      description TEXT DEFAULT '',
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- TEST PLANS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS test_plans (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      generated_at TEXT,
      status TEXT DEFAULT 'draft',
      version INTEGER DEFAULT 1,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- TESTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      test_plan_id TEXT NOT NULL,
      application_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      severity_estimate TEXT DEFAULT 'MEDIUM',
      affected_component TEXT,
      workflow TEXT,
      safety_level TEXT DEFAULT 'Safe',
      required_inputs TEXT DEFAULT '{}',
      inputs TEXT DEFAULT '{}',
      included INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (test_plan_id) REFERENCES test_plans(id),
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- TEST RUNS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      test_plan_id TEXT,
      profile TEXT DEFAULT 'standard',
      status TEXT DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      score REAL,
      summary TEXT DEFAULT '{}',
      is_simulated INTEGER DEFAULT 0,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- TEST RESULTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      test_run_id TEXT NOT NULL,
      test_id TEXT,
      status TEXT DEFAULT 'pending',
      expected_result TEXT DEFAULT '',
      actual_result TEXT DEFAULT '',
      severity TEXT,
      summary TEXT DEFAULT '',
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (test_run_id) REFERENCES test_runs(id)
    );

    -- ============================================================
    -- FINDINGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      test_run_id TEXT,
      test_result_id TEXT,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      evidence TEXT DEFAULT '{}',
      impact TEXT DEFAULT '',
      root_cause TEXT DEFAULT '',
      recommendation TEXT DEFAULT '',
      confidence TEXT DEFAULT 'observed',
      status TEXT DEFAULT 'open',
      is_simulated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      component TEXT DEFAULT '',
      workflow TEXT DEFAULT '',
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- REMEDIATIONS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS remediations (
      id TEXT PRIMARY KEY,
      finding_id TEXT NOT NULL,
      decision TEXT,
      recommendation TEXT DEFAULT '',
      user_edit TEXT DEFAULT '',
      status TEXT DEFAULT 'proposed',
      created_at TEXT NOT NULL,
      verified_at TEXT,
      FOREIGN KEY (finding_id) REFERENCES findings(id)
    );

    -- ============================================================
    -- RETESTS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS retests (
      id TEXT PRIMARY KEY,
      finding_id TEXT NOT NULL,
      original_result TEXT DEFAULT '{}',
      new_result TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      score_before REAL,
      score_after REAL,
      before_evidence TEXT DEFAULT '{}',
      after_evidence TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (finding_id) REFERENCES findings(id)
    );

    -- ============================================================
    -- TEST METRICS (for load/concurrency tests)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS test_metrics (
      id TEXT PRIMARY KEY,
      test_run_id TEXT NOT NULL,
      stage INTEGER,
      concurrency INTEGER,
      total_requests INTEGER DEFAULT 0,
      successful_requests INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0,
      timeout_requests INTEGER DEFAULT 0,
      average_latency REAL DEFAULT 0,
      p95_latency REAL DEFAULT 0,
      p99_latency REAL DEFAULT 0,
      throughput REAL DEFAULT 0,
      error_rate REAL DEFAULT 0,
      is_degradation_point INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (test_run_id) REFERENCES test_runs(id)
    );

    -- ============================================================
    -- EVIDENCE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      finding_id TEXT,
      test_result_id TEXT,
      request TEXT DEFAULT '{}',
      response TEXT DEFAULT '{}',
      status_code INTEGER,
      timestamp TEXT NOT NULL,
      latency REAL,
      test_configuration TEXT DEFAULT '{}',
      execution_timeline TEXT DEFAULT '[]'
    );

    -- ============================================================
    -- AUDIT LOGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      application_id TEXT,
      user_id TEXT DEFAULT 'system',
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      metadata TEXT DEFAULT '{}',
      timestamp TEXT NOT NULL
    );

    -- ============================================================
    -- SAFETY SETTINGS
    -- ============================================================
    CREATE TABLE IF NOT EXISTS safety_settings (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL UNIQUE,
      max_concurrency INTEGER DEFAULT 10,
      max_requests_per_second INTEGER DEFAULT 50,
      allow_destructive_writes INTEGER DEFAULT 0,
      sandbox_mode INTEGER DEFAULT 1,
      ownership_confirmation TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    -- ============================================================
    -- INDEXES for query performance
    -- ============================================================
    CREATE INDEX IF NOT EXISTS idx_discovery_app_id ON discovery_results(application_id);
    CREATE INDEX IF NOT EXISTS idx_roles_app_id ON application_roles(application_id);
    CREATE INDEX IF NOT EXISTS idx_entities_app_id ON application_entities(application_id);
    CREATE INDEX IF NOT EXISTS idx_test_plans_app_id ON test_plans(application_id);
    CREATE INDEX IF NOT EXISTS idx_tests_plan_id ON tests(test_plan_id);
    CREATE INDEX IF NOT EXISTS idx_tests_app_id ON tests(application_id);
    CREATE INDEX IF NOT EXISTS idx_tests_category ON tests(category);
    CREATE INDEX IF NOT EXISTS idx_test_runs_app_id ON test_runs(application_id);
    CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
    CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(test_run_id);
    CREATE INDEX IF NOT EXISTS idx_findings_app_id ON findings(application_id);
    CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
    CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
    CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);
    CREATE INDEX IF NOT EXISTS idx_findings_run_id ON findings(test_run_id);
    CREATE INDEX IF NOT EXISTS idx_remediations_finding ON remediations(finding_id);
    CREATE INDEX IF NOT EXISTS idx_retests_finding ON retests(finding_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_run_id ON test_metrics(test_run_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_finding ON evidence(finding_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_result ON evidence(test_result_id);
    CREATE INDEX IF NOT EXISTS idx_audit_app_id ON audit_logs(application_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_safety_app_id ON safety_settings(application_id);

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      report_data TEXT NOT NULL,
      overall_score REAL NOT NULL,
      readiness_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );
  `);

  console.log('[DB] All tables and indexes created successfully.');
}

module.exports = setupDatabase;