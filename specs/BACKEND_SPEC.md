# Guardian Backend Specification

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite via `better-sqlite3` (synchronous API, simpler)
- **Port**: 3001
- **Dependencies**: express, better-sqlite3, uuid, cors, dotenv

## Project Directory
`C:\Users\Aryan\.gemini\antigravity\scratch\guardian\backend`

## File Structure
```
backend/
├── package.json
├── .env
├── server.js                    # Entry point
├── db/
│   ├── setup.js                 # Schema creation + migrations
│   └── connection.js            # DB singleton
├── middleware/
│   ├── errorHandler.js          # Structured error responses
│   └── auditLogger.js           # Audit logging middleware
├── routes/
│   ├── applications.js          # CRUD + discovery
│   ├── testPlans.js             # AI test plan generation
│   ├── testRuns.js              # Test execution orchestration
│   ├── findings.js              # Findings + diagnosis
│   ├── remediations.js          # Remediation management
│   ├── retests.js               # Retest engine
│   ├── evidence.js              # Evidence viewer + replay
│   ├── safety.js                # Safety settings
│   ├── reports.js               # Report generation
│   └── audit.js                 # Audit log queries
├── engines/
│   ├── discovery.js             # App discovery + demo simulation
│   ├── testPlanGenerator.js     # AI test plan generation
│   ├── authorization.js         # Authorization test engine
│   ├── concurrency.js           # Concurrency test engine
│   ├── load.js                  # Progressive load test engine
│   ├── findingsEngine.js        # Finding creation from test results
│   ├── diagnosis.js             # AI diagnosis engine
│   ├── scoring.js               # Production readiness scoring
│   └── demo.js                  # MediFlow demo data generator
└── utils/
    ├── errors.js                # Custom error classes
    └── constants.js             # Shared constants
```

## API Response Contract

ALL responses must follow this shape:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Success (list):**
```json
{
  "success": true,
  "data": [ ... ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "DISCOVERY_FAILED",
    "message": "Discovery failed. Check the application URL and try again."
  }
}
```

**NEVER** return raw objects, stack traces, or unstructured errors.

## ID Generation
Use `uuid` v4 for all entity IDs.

## Timestamps
Use ISO 8601 strings (e.g., `new Date().toISOString()`).

---

## DATABASE SCHEMA

Create ALL these tables in `db/setup.js`. Use `CREATE TABLE IF NOT EXISTS`.

### applications
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | UUID |
| name | TEXT NOT NULL | |
| description | TEXT | |
| base_url | TEXT | |
| api_spec | TEXT | JSON string |
| status | TEXT DEFAULT 'created' | created, discovering, discovered, testing, tested |
| readiness_score | REAL | 0-100 |
| readiness_status | TEXT | READY, NEEDS_ATTENTION, HIGH_RISK, PRODUCTION_BLOCKER |
| created_at | TEXT | ISO 8601 |
| updated_at | TEXT | ISO 8601 |

### discovery_results
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | UUID |
| application_id | TEXT NOT NULL | FK → applications |
| status | TEXT | pending, running, completed, failed |
| pages | TEXT | JSON array |
| endpoints | TEXT | JSON array |
| forms | TEXT | JSON array |
| roles | TEXT | JSON array |
| entities | TEXT | JSON array |
| sensitive_fields | TEXT | JSON array |
| critical_workflows | TEXT | JSON array |
| confidence_scores | TEXT | JSON object |
| is_simulated | INTEGER DEFAULT 0 | 1 = demo data |
| created_at | TEXT | |
| completed_at | TEXT | |

### application_roles
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| application_id | TEXT NOT NULL |
| name | TEXT NOT NULL |
| description | TEXT |

### application_entities
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| application_id | TEXT NOT NULL |
| name | TEXT NOT NULL |
| type | TEXT |
| description | TEXT |

### test_plans
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| application_id | TEXT NOT NULL |
| generated_at | TEXT |
| status | TEXT | draft, active, archived |
| version | INTEGER DEFAULT 1 |

### tests
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | |
| test_plan_id | TEXT NOT NULL | |
| application_id | TEXT NOT NULL | |
| category | TEXT NOT NULL | security, concurrency, load |
| name | TEXT NOT NULL | |
| description | TEXT | |
| severity_estimate | TEXT | CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL |
| required_inputs | TEXT | JSON |
| included | INTEGER DEFAULT 1 | 1=included, 0=excluded |
| status | TEXT DEFAULT 'pending' | pending, running, passed, failed, error, blocked |

### test_runs
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| application_id | TEXT NOT NULL |
| test_plan_id | TEXT |
| profile | TEXT |
| status | TEXT | pending, running, completed, failed, incomplete, paused, stopped |
| started_at | TEXT |
| completed_at | TEXT |
| score | REAL |
| summary | TEXT | JSON |
| is_simulated | INTEGER DEFAULT 0 |

### test_results
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| test_run_id | TEXT NOT NULL |
| test_id | TEXT |
| status | TEXT | passed, failed, error, blocked, warning |
| expected_result | TEXT |
| actual_result | TEXT |
| severity | TEXT |
| summary | TEXT |
| started_at | TEXT |
| completed_at | TEXT |

### findings
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| application_id | TEXT NOT NULL |
| test_run_id | TEXT |
| test_result_id | TEXT |
| category | TEXT | security, scalability, reliability, business_logic, data_integrity |
| severity | TEXT NOT NULL | CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL |
| title | TEXT NOT NULL |
| description | TEXT |
| evidence | TEXT | JSON |
| impact | TEXT |
| root_cause | TEXT |
| recommendation | TEXT |
| confidence | TEXT | observed, likely, probable, inferred |
| status | TEXT DEFAULT 'open' | open, resolved, accepted, false_positive |
| is_simulated | INTEGER DEFAULT 0 |
| created_at | TEXT |
| resolved_at | TEXT |

### remediations
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| finding_id | TEXT NOT NULL |
| decision | TEXT | approved, rejected, edited |
| recommendation | TEXT |
| user_edit | TEXT |
| status | TEXT | proposed, approved, rejected, verified |
| created_at | TEXT |
| verified_at | TEXT |

### retests
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| finding_id | TEXT NOT NULL |
| original_result | TEXT | JSON |
| new_result | TEXT | JSON |
| status | TEXT | pending, running, passed, failed, pending_verification |
| score_before | REAL |
| score_after | REAL |
| before_evidence | TEXT | JSON |
| after_evidence | TEXT | JSON |
| created_at | TEXT |

### test_metrics
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| test_run_id | TEXT NOT NULL |
| stage | INTEGER |
| concurrency | INTEGER |
| total_requests | INTEGER |
| successful_requests | INTEGER |
| failed_requests | INTEGER |
| timeout_requests | INTEGER |
| average_latency | REAL |
| p95_latency | REAL |
| p99_latency | REAL |
| throughput | REAL |
| error_rate | REAL |
| is_degradation_point | INTEGER DEFAULT 0 |
| created_at | TEXT |

### evidence
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| finding_id | TEXT |
| test_result_id | TEXT |
| request | TEXT | JSON |
| response | TEXT | JSON |
| status_code | INTEGER |
| timestamp | TEXT |
| latency | REAL |
| test_configuration | TEXT | JSON |
| execution_timeline | TEXT | JSON |

### audit_logs
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| application_id | TEXT |
| user_id | TEXT DEFAULT 'system' |
| action | TEXT NOT NULL |
| entity_type | TEXT |
| entity_id | TEXT |
| metadata | TEXT | JSON |
| timestamp | TEXT |

### safety_settings
| Column | Type |
|--------|------|
| id | TEXT PRIMARY KEY |
| application_id | TEXT NOT NULL UNIQUE |
| max_concurrency | INTEGER DEFAULT 10 |
| max_requests_per_second | INTEGER DEFAULT 50 |
| allow_destructive_writes | INTEGER DEFAULT 0 |
| sandbox_mode | INTEGER DEFAULT 1 |
| ownership_confirmation | TEXT |
| updated_at | TEXT |

**Create indexes on**: application_id (all tables), test_run_id, finding_id, status, severity, category, timestamp.

---

## API ROUTES

### Applications
- `POST /api/applications` — Create application
- `GET /api/applications` — List applications (paginated)
- `GET /api/applications/:id` — Get application detail
- `PUT /api/applications/:id` — Update application
- `POST /api/applications/:id/discovery` — Start discovery
- `GET /api/applications/:id/discovery` — Get discovery results
- `POST /api/applications/:id/discovery/retry` — Retry discovery

### Test Plans
- `POST /api/applications/:id/test-plan/generate` — Generate AI test plan
- `GET /api/applications/:id/test-plan` — Get current test plan with tests
- `PATCH /api/tests/:id` — Update test (include/exclude, provide inputs)

### Test Runs
- `POST /api/test-runs` — Start a test run (body: { application_id, test_plan_id, profile, categories[] })
- `POST /api/test-runs/authorization` — Run authorization tests
- `POST /api/test-runs/concurrency` — Run concurrency tests
- `POST /api/test-runs/load` — Run load tests
- `GET /api/applications/:id/test-runs` — List test runs for app
- `GET /api/test-runs/:id` — Get test run detail with results
- `POST /api/test-runs/:id/pause` — Pause a run
- `POST /api/test-runs/:id/stop` — Stop a run
- `POST /api/test-runs/compare` — Compare two runs

### Findings
- `GET /api/applications/:id/findings` — List findings (filterable by severity, category, status)
- `GET /api/findings/:id` — Get finding detail
- `POST /api/findings/:id/diagnose` — AI diagnosis

### Remediations
- `POST /api/findings/:id/remediation` — Create remediation
- `PATCH /api/remediations/:id` — Update remediation (approve/reject/edit)
- `GET /api/findings/:id/remediation` — Get remediation for finding

### Retests
- `POST /api/findings/:id/retest` — Retest a finding
- `GET /api/findings/:id/retest` — Get retest results

### Evidence
- `GET /api/findings/:id/evidence` — Get evidence for finding
- `POST /api/evidence/:id/replay` — Replay test with same safety config
- `GET /api/test-results/:id/evidence` — Get evidence for test result

### Safety
- `GET /api/applications/:id/safety` — Get safety settings
- `PUT /api/applications/:id/safety` — Update safety settings

### Reports
- `POST /api/applications/:id/reports/generate` — Generate report
- `GET /api/applications/:id/reports` — Get latest report

### Audit
- `GET /api/applications/:id/audit` — Get audit log (paginated)
- `GET /api/audit` — Global audit log

### Scoring
- `GET /api/applications/:id/score` — Get detailed readiness score

---

## ENGINE SPECIFICATIONS

### Discovery Engine (`engines/discovery.js`)
When base_url is unreachable or not provided, use **demo simulation mode**.

Demo data for MediFlow EMR:
- **Roles**: Patient, Doctor, Receptionist, Admin
- **Entities**: Patient, Appointment, Medical Report, Prescription, Payment
- **Critical Workflows**: Book Appointment, Cancel Appointment, View Medical Report, Create Prescription, Process Payment
- **Endpoints**: Generate realistic CRUD endpoints for each entity (GET/POST/PUT/DELETE)
- **Pages**: Login, Dashboard, Patient Portal, Doctor Portal, Admin Panel, Appointments, Reports
- **Sensitive Fields**: SSN, Date of Birth, Medical History, Insurance ID, Payment Info
- **Forms**: Login Form, Registration, Appointment Booking, Prescription Form, Payment Form

Mark all demo data with `is_simulated: true`.

### Test Plan Generator (`engines/testPlanGenerator.js`)
Analyze discovery results and generate tests in 3 categories:

**Security Tests** (based on discovered roles, entities, endpoints):
- IDOR / Broken Object-Level Authorization for each entity (e.g., "Patient A accessing Patient B's records")
- Authentication bypass attempts
- Sensitive data exposure checks
- Rate limiting verification

**Concurrency Tests** (based on critical workflows):
- Double-booking for appointment slots
- Duplicate payment processing
- Race condition on resource claims

**Load Tests** (for discovered endpoints):
- Progressive load test on critical endpoints
- API response degradation detection

Each test must have: name, description, severity_estimate, required_inputs (JSON), included (default true).

### Authorization Engine (`engines/authorization.js`)
Demo simulation:
1. Create scenario: Patient A (user_a) owns Resource A
2. Patient B (user_b) attempts GET /api/patients/{resource_a_id}
3. Expected: 403 Forbidden
4. Simulated actual: 200 OK (vulnerable)
5. Create CRITICAL finding with evidence
6. Immediately pause run on critical finding

### Concurrency Engine (`engines/concurrency.js`)
Demo simulation:
1. Initial state: 1 available appointment slot
2. Two simultaneous booking requests
3. Both succeed (race condition)
4. Create CRITICAL finding: "Double booking detected: 2 successful reservations for 1 available slot"
5. Record timeline with timestamps

### Load Engine (`engines/load.js`)
Demo simulation stages:
| Users | Avg Latency | P95 | P99 | Success Rate | Throughput |
|-------|-------------|-----|-----|--------------|------------|
| 10 | 180ms | 220ms | 280ms | 100% | 55 req/s |
| 25 | 195ms | 240ms | 310ms | 100% | 128 req/s |
| 50 | 220ms | 310ms | 420ms | 100% | 227 req/s |
| 100 | 290ms | 480ms | 650ms | 99.8% | 345 req/s |
| 250 | 620ms | 1.1s | 1.8s | 98.5% | 403 req/s |
| 500 | 1900ms | 3.2s | 4.5s | 91.1% | 269 req/s |
| 1000 | 4700ms | 7.8s | 12.1s | 72.4% | 153 req/s |

Degradation point: 250 users (where error rate first exceeds 1% or latency exceeds 1s).

### Findings Engine (`engines/findingsEngine.js`)
Convert failed/suspicious test results into findings:
- Map test categories to finding categories
- Set severity based on test result
- Generate description, impact, root_cause, recommendation
- Attach evidence
- Set confidence level (observed, likely, probable, inferred)

### Diagnosis Engine (`engines/diagnosis.js`)
Generate structured diagnosis:
- What happened (factual observation)
- Evidence (reference to test evidence)
- Impact (business/security impact)
- Root Cause (technical analysis — use "likely", "probable" when not certain)
- Recommendation (actionable fix)
- Confidence level

If analysis cannot be completed: status = ANALYSIS_INCOMPLETE, preserve raw evidence.

### Scoring Engine (`engines/scoring.js`)
Calculate production readiness score:
- Security: 30% weight
- Scalability: 25% weight
- Reliability: 20% weight
- Business Logic: 15% weight
- Data Integrity: 10% weight

Category score = 100 - (sum of severity penalties for unresolved findings in category)
- CRITICAL: -40 points
- HIGH: -20 points
- MEDIUM: -10 points
- LOW: -5 points
- INFORMATIONAL: -1 point

Floor at 0.

**CRITICAL OVERRIDE**: If ANY unresolved CRITICAL finding exists → readiness_status = PRODUCTION_BLOCKER regardless of score.

Status thresholds:
- ≥ 80 and no criticals → READY
- 60-79 → NEEDS_ATTENTION
- < 60 → HIGH_RISK
- Any unresolved CRITICAL → PRODUCTION_BLOCKER

### Demo Engine (`engines/demo.js`)
Provide a `runFullDemo(applicationId)` function that orchestrates the complete demo flow:
1. Create MediFlow discovery data
2. Generate test plan
3. Run authorization test → CRITICAL IDOR finding
4. Run concurrency test → CRITICAL double-booking finding
5. Run load test → degradation at 250 users
6. Generate diagnosis for each finding
7. Calculate initial score (should be PRODUCTION_BLOCKER)

Also provide `runDemoRetest(findingId)` that:
1. Simulates fix applied
2. Retests → PASS
3. Resolves finding
4. Recalculates score (should improve)

---

## ERROR HANDLING

Use these error codes:
- DISCOVERY_FAILED
- APPLICATION_UNREACHABLE
- APPLICATION_NOT_FOUND
- TEST_PLAN_NOT_FOUND
- TEST_RUN_NOT_FOUND
- FINDING_NOT_FOUND
- TEST_BLOCKED
- RATE_LIMITED
- SAFETY_LIMIT_REACHED
- ANALYSIS_INCOMPLETE
- RETEST_UNAVAILABLE
- INTEGRATION_FAILED
- VALIDATION_ERROR
- INTERNAL_ERROR

The error handler middleware must catch all errors and return structured JSON. Never expose stack traces.

---

## SAFETY CONTROLS

Default safety settings for new applications:
- max_concurrency: 10
- max_requests_per_second: 50
- allow_destructive_writes: false
- sandbox_mode: true

Before enabling destructive writes, require ownership_confirmation = "I own this app and accept risk".

---

## AUDIT LOGGING

Log these events:
- application.created, application.updated
- discovery.started, discovery.completed, discovery.failed, discovery.retried
- test_plan.generated
- test_run.started, test_run.completed, test_run.paused, test_run.stopped
- finding.created, finding.resolved
- diagnosis.generated, diagnosis.failed
- remediation.created, remediation.updated
- retest.started, retest.completed
- safety.updated
- report.generated
- evidence.replayed

---

## VERIFICATION

After building everything:
1. Run `npm install`
2. Start the server with `node server.js`
3. Test `GET /api/applications` returns `{ success: true, data: [], total: 0 }`
4. Test `POST /api/applications` creates an app
5. Test the demo flow works end-to-end
