const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend');

const DIRS = [
  '',
  'db',
  'utils',
  'middleware',
  'routes',
  'engines'
];

const FILES = {
  'package.json': `{
  "name": "guardian-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.5.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "uuid": "^11.0.2"
  }
}`,
  '.env': 'PORT=3001',
  'utils/constants.js': `module.exports = {
  SEVERITY: { CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW', INFORMATIONAL: 'INFORMATIONAL' },
  STATUS: { READY: 'READY', NEEDS_ATTENTION: 'NEEDS_ATTENTION', HIGH_RISK: 'HIGH_RISK', PRODUCTION_BLOCKER: 'PRODUCTION_BLOCKER' }
};`,
  'utils/errors.js': `class GuardianError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
module.exports = { GuardianError };`,
  'middleware/errorHandler.js': `module.exports = (err, req, res, next) => {
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An internal error occurred';
  res.status(err.status || 500).json({ success: false, error: { code, message } });
};`,
  'middleware/auditLogger.js': `const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
module.exports = (req, res, next) => {
  // simplified audit logging logic, typically hooked on res.on('finish')
  next();
};`,
  'db/connection.js': `const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'guardian.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
module.exports = db;`,
  'db/setup.js': `const db = require('./connection');
module.exports = () => {
  db.exec(\`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, base_url TEXT, api_spec TEXT,
      status TEXT DEFAULT 'created', readiness_score REAL, readiness_status TEXT,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS discovery_results (
      id TEXT PRIMARY KEY, application_id TEXT NOT NULL, status TEXT, pages TEXT, endpoints TEXT, forms TEXT, roles TEXT,
      entities TEXT, sensitive_fields TEXT, critical_workflows TEXT, confidence_scores TEXT, is_simulated INTEGER DEFAULT 0,
      created_at TEXT, completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS application_roles (id TEXT PRIMARY KEY, application_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT);
    CREATE TABLE IF NOT EXISTS application_entities (id TEXT PRIMARY KEY, application_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT, description TEXT);
    CREATE TABLE IF NOT EXISTS test_plans (id TEXT PRIMARY KEY, application_id TEXT NOT NULL, generated_at TEXT, status TEXT, version INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS tests (id TEXT PRIMARY KEY, test_plan_id TEXT NOT NULL, application_id TEXT NOT NULL, category TEXT NOT NULL, name TEXT NOT NULL, description TEXT, severity_estimate TEXT, required_inputs TEXT, included INTEGER DEFAULT 1, status TEXT DEFAULT 'pending');
    CREATE TABLE IF NOT EXISTS test_runs (id TEXT PRIMARY KEY, application_id TEXT NOT NULL, test_plan_id TEXT, profile TEXT, status TEXT, started_at TEXT, completed_at TEXT, score REAL, summary TEXT, is_simulated INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS test_results (id TEXT PRIMARY KEY, test_run_id TEXT NOT NULL, test_id TEXT, status TEXT, expected_result TEXT, actual_result TEXT, severity TEXT, summary TEXT, started_at TEXT, completed_at TEXT);
    CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, application_id TEXT NOT NULL, test_run_id TEXT, test_result_id TEXT, category TEXT, severity TEXT NOT NULL, title TEXT NOT NULL, description TEXT, evidence TEXT, impact TEXT, root_cause TEXT, recommendation TEXT, confidence TEXT, status TEXT DEFAULT 'open', is_simulated INTEGER DEFAULT 0, created_at TEXT, resolved_at TEXT);
    CREATE TABLE IF NOT EXISTS remediations (id TEXT PRIMARY KEY, finding_id TEXT NOT NULL, decision TEXT, recommendation TEXT, user_edit TEXT, status TEXT, created_at TEXT, verified_at TEXT);
    CREATE TABLE IF NOT EXISTS retests (id TEXT PRIMARY KEY, finding_id TEXT NOT NULL, original_result TEXT, new_result TEXT, status TEXT, score_before REAL, score_after REAL, before_evidence TEXT, after_evidence TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS test_metrics (id TEXT PRIMARY KEY, test_run_id TEXT NOT NULL, stage INTEGER, concurrency INTEGER, total_requests INTEGER, successful_requests INTEGER, failed_requests INTEGER, timeout_requests INTEGER, average_latency REAL, p95_latency REAL, p99_latency REAL, throughput REAL, error_rate REAL, is_degradation_point INTEGER DEFAULT 0, created_at TEXT);
    CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, finding_id TEXT, test_result_id TEXT, request TEXT, response TEXT, status_code INTEGER, timestamp TEXT, latency REAL, test_configuration TEXT, execution_timeline TEXT);
    CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, application_id TEXT, user_id TEXT DEFAULT 'system', action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, metadata TEXT, timestamp TEXT);
    CREATE TABLE IF NOT EXISTS safety_settings (id TEXT PRIMARY KEY, application_id TEXT NOT NULL UNIQUE, max_concurrency INTEGER DEFAULT 10, max_requests_per_second INTEGER DEFAULT 50, allow_destructive_writes INTEGER DEFAULT 0, sandbox_mode INTEGER DEFAULT 1, ownership_confirmation TEXT, updated_at TEXT);
    CREATE INDEX IF NOT EXISTS idx_app_id ON applications(id);
    CREATE INDEX IF NOT EXISTS idx_test_run_id ON test_runs(id);
    CREATE INDEX IF NOT EXISTS idx_finding_id ON findings(id);
  \`);
};`,
  'server.js': `const express = require('express');
const cors = require('cors');
require('dotenv').config();
const setupDB = require('./db/setup');
const errorHandler = require('./middleware/errorHandler');
const auditLogger = require('./middleware/auditLogger');

const app = express();
app.use(cors());
app.use(express.json());
app.use(auditLogger);

setupDB();

// Mount routes
app.use('/api/applications', require('./routes/applications'));
app.use('/api/test-runs', require('./routes/testRuns'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/findings', require('./routes/findings'));
app.use('/api/remediations', require('./routes/remediations'));
app.use('/api/evidence', require('./routes/evidence'));
app.use('/api/audit', require('./routes/audit'));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
  'routes/applications.js': `const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const demoEngine = require('../engines/demo');

router.get('/', (req, res) => {
  const apps = db.prepare('SELECT * FROM applications').all();
  res.json({ success: true, data: apps, total: apps.length, page: 1, pageSize: 20 });
});

router.post('/', (req, res) => {
  const id = uuidv4();
  const { name, description, base_url } = req.body;
  db.prepare('INSERT INTO applications (id, name, description, base_url, created_at) VALUES (?, ?, ?, ?, ?)').run(id, name, description || '', base_url || '', new Date().toISOString());
  
  // also create safety settings
  db.prepare('INSERT INTO safety_settings (id, application_id, updated_at) VALUES (?, ?, ?)').run(uuidv4(), id, new Date().toISOString());
  
  const newApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
  res.json({ success: true, data: newApp });
});

router.post('/:id/discovery', (req, res) => {
  // run demo full flow for discovery as per spec
  demoEngine.runFullDemo(req.params.id);
  res.json({ success: true, data: { status: 'completed' } });
});

module.exports = router;`,
  'routes/tests.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/testPlans.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/testRuns.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/findings.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/remediations.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/retests.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/evidence.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/safety.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/reports.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'routes/audit.js': `const express = require('express'); const router = express.Router(); module.exports = router;`,
  'engines/discovery.js': `module.exports = {};`,
  'engines/testPlanGenerator.js': `module.exports = {};`,
  'engines/authorization.js': `module.exports = {};`,
  'engines/concurrency.js': `module.exports = {};`,
  'engines/load.js': `module.exports = {};`,
  'engines/findingsEngine.js': `module.exports = {};`,
  'engines/diagnosis.js': `module.exports = {};`,
  'engines/scoring.js': `module.exports = {};`,
  'engines/demo.js': `const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

exports.runFullDemo = (appId) => {
  // Generate demo data
  const ts = new Date().toISOString();
  db.prepare("UPDATE applications SET readiness_status = 'PRODUCTION_BLOCKER', readiness_score = 45 WHERE id = ?").run(appId);
};
exports.runDemoRetest = (findingId) => {};`
};

for (const d of DIRS) {
  const dirPath = path.join(BACKEND_DIR, d);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

for (const [filepath, content] of Object.entries(FILES)) {
  fs.writeFileSync(path.join(BACKEND_DIR, filepath), content);
}
console.log('Setup script complete');
