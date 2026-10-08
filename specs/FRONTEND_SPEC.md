# Guardian Frontend Specification

## Tech Stack
- **Framework**: React 18
- **Build**: Vite
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Font**: IBM Plex Sans (Google Fonts)
- **API Base**: http://localhost:3001/api

## Project Directory
`C:\Users\Aryan\.gemini\antigravity\scratch\guardian\frontend`

## File Structure
```
frontend/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── api/
│   │   └── client.js              # Centralized API client
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx        # Main layout with sidebar
│   │   │   └── Sidebar.jsx         # Persistent navigation
│   │   └── common/
│   │       ├── ScoreDisplay.jsx    # Readiness score circle/badge
│   │       ├── SeverityBadge.jsx   # CRITICAL/HIGH/MEDIUM/LOW badges
│   │       ├── StatusBadge.jsx     # Status indicators
│   │       ├── EmptyState.jsx      # Empty state component
│   │       ├── LoadingSkeleton.jsx # Skeleton loader
│   │       ├── ErrorMessage.jsx    # Error display
│   │       ├── ProgressBar.jsx     # Score progress bar
│   │       └── ConfirmDialog.jsx   # Confirmation modal
│   └── pages/
│       ├── Overview.jsx            # Production readiness dashboard
│       ├── ApplicationCreate.jsx   # Create new application
│       ├── Discovery.jsx           # Application discovery
│       ├── ApplicationMap.jsx      # Interactive application map
│       ├── TestPlan.jsx            # AI test plan generation
│       ├── SecurityCenter.jsx      # Security dashboard
│       ├── AuthorizationTest.jsx   # Authorization test detail
│       ├── ScalabilityCenter.jsx   # Scalability/load dashboard
│       ├── ConcurrencyCenter.jsx   # Concurrency testing
│       ├── BusinessLogic.jsx       # Business logic tests
│       ├── ActiveTestRun.jsx       # Live test execution
│       ├── TestRuns.jsx            # Test history
│       ├── Findings.jsx            # Findings list
│       ├── FindingDetail.jsx       # Finding detail + diagnosis
│       ├── EvidenceViewer.jsx      # Evidence viewer
│       ├── Remediation.jsx         # Remediation center
│       ├── Retest.jsx              # Retest before/after
│       ├── Reports.jsx             # Report generation/view
│       └── Settings.jsx            # Safety controls
```

---

## DESIGN SYSTEM

### Colors
```
Primary: #334EEC (indigo-blue)
Primary Hover: #2a41c9
Primary Light: #EEF1FD (backgrounds)

Accent: #FF8A00 (orange)
Accent Hover: #e67e00

Background: #F8F9FB
Surface: #FFFFFF
Border: #E2E5EB
Text Primary: #1A1D26
Text Secondary: #5A6072
Text Muted: #8B92A5

Semantic:
Success: #16A34A (green-600)
Success Light: #F0FDF4
Warning: #D97706 (amber-600)
Warning Light: #FFFBEB
Critical/Error: #DC2626 (red-600)
Critical Light: #FEF2F2
Info: #4F46E5 (indigo-600)
Info Light: #EEF2FF
```

### Typography
- Font: IBM Plex Sans (import from Google Fonts)
- Headings: 600 weight
- Body: 400 weight
- Code/Evidence: IBM Plex Mono

### Do NOT use
- Gradients, neon, glassmorphism, liquid glass
- Radial orbs, dot-grid backgrounds
- Emojis, sparkle icons, animated arrows
- Inter, Geist, Space Grotesk fonts
- Bento grids, fake terminals, fake testimonials

### Design Approach
- Clean, professional, restrained
- Security operations / engineering platform feel
- Clear visual hierarchy
- Semantic colors for status (not decorative)
- Text labels + icons for state (never color alone)

---

## API CLIENT (`api/client.js`)

Create a centralized fetch wrapper:
```js
const API_BASE = 'http://localhost:3001/api';

async function apiRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  put: (path, body) => apiRequest('PUT', path, body),
  patch: (path, body) => apiRequest('PATCH', path, body),
  delete: (path) => apiRequest('DELETE', path),
};
```

**CRITICAL**: Never display `[object Object]` to users. Always use `error.message` string.

---

## ROUTING

```
/                           → Overview (dashboard)
/applications/new           → ApplicationCreate
/applications/:id           → Overview (app-specific)
/applications/:id/discovery → Discovery
/applications/:id/map       → ApplicationMap
/applications/:id/test-plan → TestPlan
/security                   → SecurityCenter
/security/authorization/:id → AuthorizationTest
/scalability                → ScalabilityCenter
/concurrency                → ConcurrencyCenter
/business-logic             → BusinessLogic
/test-runs                  → TestRuns
/test-runs/:id              → ActiveTestRun
/findings                   → Findings
/findings/:id               → FindingDetail
/findings/:id/evidence      → EvidenceViewer
/findings/:id/remediation   → Remediation
/findings/:id/retest        → Retest
/reports                    → Reports
/settings                   → Settings
```

---

## SIDEBAR NAVIGATION

Structure:
```
GUARDIAN (logo/brand)

OVERVIEW

APPLICATION
  Application Map
  Workflows

TESTING
  Security
  Scalability
  Concurrency
  Business Logic

RESULTS
  Test Runs
  Findings
  Reports

REMEDIATION

SETTINGS
```

Show current application name. Sidebar is persistent on desktop, collapsible drawer on mobile.

---

## PAGE SPECIFICATIONS

### 1. Overview Dashboard
- Large readiness score display (84/100 example)
- Status badge: READY / NEEDS_ATTENTION / HIGH_RISK / PRODUCTION_BLOCKER
- Five category score bars: Security (30%), Scalability (25%), Reliability (20%), Business Logic (15%), Data Integrity (10%)
- Critical Findings summary (count + list of titles)
- Recent Test Runs (last 5)
- Latest Degradation Point (if load tests run)
- PRODUCTION BLOCKER warning when applicable (restrained red, not flashing/neon)
- Empty state: "No tests have been run yet. Run your first Guardian scan to discover security, scalability and reliability issues." + "Start First Scan" button
- **Poll** `GET /api/applications/:id/score` for latest data

### 2. Application Create
- Form: Name, Description, Base URL (optional), API Spec (optional textarea)
- After creation → navigate to discovery page
- Call `POST /api/applications`

### 3. Discovery
- "Start Discovery" button → `POST /api/applications/:id/discovery`
- Progress states: Discovering application → Mapping roles → Mapping entities → Mapping workflows → Analyzing endpoints → Building application map
- Use skeleton loaders during progress
- On completion show: pages, endpoints, forms, entities, roles, sensitive fields, critical workflows, confidence scores
- Demo indicator when `is_simulated: true`
- Empty state: "No reachable endpoints found"
- Buttons: Retry Discovery, Provide Test Credentials
- Never display submitted credentials after submission

### 4. Application Map
- Visual representation of the application model
- Sections: Authentication, API Endpoints, Database Entities, External Services, Business Workflows
- For MediFlow: show roles, entities, critical workflows
- Clicking an entity → show related tests, coverage, findings
- Use cards/tree layout (not a complex graph library — keep it simple and clean)

### 5. Test Plan
- "Generate AI Test Plan" button (disabled until discovery completes with tooltip "Complete discovery first")
- Three collapsible groups: Security Tests, Concurrency Tests, Load Tests
- Each test card: name, description, severity estimate, required inputs, Include/Exclude toggle
- Summary bar: X tests generated, X selected, X require input, X excluded
- Missing inputs → inline form to provide them
- Never display secrets after submission
- Tests are NOT executed from this page

### 6. Security Center
- Security score display
- Stats: Tests Run, Passed, Warnings, High, Critical
- Category cards: Authentication, Authorization, Object Access, Sensitive Data, Rate Limiting, Session Security
- Each category shows test count and status
- Link to individual test details

### 7. Authorization Test Detail
- Finding title: e.g., "Broken Object-Level Authorization"
- Severity badge: CRITICAL
- Endpoint: GET /api/patients/:id
- Scenario description
- Expected vs Observed results
- Impact statement
- Actions: View Evidence, Generate Fix, Retest
- Permission Matrix: Resource × Role table showing Allowed/Denied/Restricted/Suspicious

### 8. Scalability Center
- Stage selector: 10, 25, 50, 100, 250, 500, 1000
- Response time chart (line chart via Recharts)
- Throughput chart
- Error rate chart
- Metrics table: Concurrent Users | Total Requests | Successful | Failed | Timeouts | Avg Latency | P95 | P99 | Throughput | Error Rate
- Degradation Point highlight
- Demo indicator for simulated data
- Load Test Controls: Concurrent Users slider, Max Users, Ramp-up, Duration, Test Profile, START LOAD TEST button
- During execution: progress bar, current stage, live metrics
- Pause/Stop buttons

### 9. Concurrency Center
- Critical operation selector (Book Appointment, etc.)
- Concurrency slider: 2-20
- Initial state display
- "Run Test" button
- Live timeline visualization:
  - T+0ms: User A checks availability
  - T+1ms: User B checks availability
  - T+4ms: User A creates booking
  - T+5ms: User B creates booking
  - T+7ms: Both succeed
- DATA INTEGRITY FAILURE badge if vulnerable
- Finding description
- Actions: View Evidence, Generate Fix, Retest

### 10. Business Logic
- Test cards: Duplicate Booking, Duplicate Payment, Invalid Status Transition, Unauthorized Workflow, Inventory Overselling, Stale Update
- Each card: severity, workflow, status, evidence link

### 11. Active Test Run
- Current test name
- Progress bar
- Elapsed time
- Stats: Request count, Success, Failure, Current stage, Latency, Error rate
- Status badges: Pending, Running, Passed, Failed, Error, Blocked, Paused
- Pause/Stop buttons
- Use structured metrics layout, NOT fake terminal

### 12. Test Runs (History)
- Table: Run ID, Date, Application, Profile, Tests, Passed, Warnings, Failures, Score
- Select two runs → Compare button
- Comparison view: Before/After score, Critical findings, Resolved, New, Improvement timeline
- INCOMPLETE runs show badge with reason

### 13. Findings
- Filters: severity (Critical/High/Medium/Low), category, status (Resolved/Unresolved)
- Search bar
- Finding cards: Title, Severity, Category, Affected Component, Status
- Click → FindingDetail

### 14. Finding Detail + AI Diagnosis
- Full finding info: title, severity, category, description, evidence, impact, root cause, recommendation, confidence, status
- AI Diagnosis section: What happened?, Evidence, Impact, Likely Root Cause, Recommendation, Confidence
- Careful language for uncertain findings
- "Analysis incomplete" message when backend returns ANALYSIS_INCOMPLETE
- Actions: Edit Recommendation, Apply Fix, Retest
- Raw evidence always accessible

### 15. Evidence Viewer
- Request panel (method, URL, headers, body)
- Response panel (status, headers, body)
- Metadata: Status Code, Timestamp, Latency
- Test Configuration details
- Execution Timeline
- "Replay Test" button
- "Export Evidence" button
- "View Technical Evidence" toggle for non-technical users

### 16. Remediation
- Problem description
- Root cause explanation
- Proposed Change (code block or structured description)
- Expected Result
- PROPOSED FIX label (never claim code was modified unless backend confirms)
- Actions: Apply Fix, Reject, Modify, Retest

### 17. Retest
- Before/After comparison layout
- BEFORE: Original result, original evidence
- AFTER: Retest result, new evidence
- PASS or FAIL verdict
- Score Impact: Before score → After score
- Update readiness score display

### 18. Reports
- Executive Summary
- Overall Score
- Category scores: Security, Scalability, Reliability, Business Logic, Data Integrity
- Critical Findings list
- Evidence summaries
- Recommended Actions
- Retest Results
- Final Readiness Decision
- "Generate Report" button
- No fake report data

### 19. Settings (Safety Controls)
- Max concurrency per test (number input)
- Max requests per second (number input)
- Allow potentially destructive writes (toggle, requires confirmation)
- Test sandbox mode (toggle)
- Confirmation dialog for destructive writes: "I own this app and accept risk"
- Cannot enable without exact confirmation text

---

## LOADING STATES

Every async operation must show loading:
- Dashboard → skeleton cards
- Discovery → step-by-step progress
- Test Plan → skeleton test cards
- Findings → skeleton list
- Diagnosis → loading spinner with "Analyzing..."
- Reports → skeleton sections
- Test execution → live progress metrics

No flashy animations. Clean, professional skeleton loaders.

---

## ERROR HANDLING

NEVER show:
- `[object Object]`
- Raw JavaScript error objects
- Stack traces

Convert ALL errors to user-friendly messages:
- "Discovery failed. Check the application URL and try again."
- "The application could not be reached."
- "The test was blocked by the configured safety limit."
- "Analysis incomplete. Raw evidence is still available."
- Unknown: "Something went wrong. Please try again."

---

## EMPTY STATES

Every list/dashboard needs an empty state:
- Dashboard: "No tests have been run yet..." + Start First Scan button
- Findings: "No findings yet. Run a test to discover issues."
- Test Runs: "No test runs yet."
- Discovery: "Start discovery to map your application."

---

## DEMO MODE

Show a clear "DEMO / SIMULATED" indicator when backend data has `is_simulated: true`.
Use a subtle banner or badge, not aggressive styling.
Never present simulated results as real measurements.

---

## RESPONSIVE DESIGN

- **Desktop** (primary): Full sidebar + content area
- **Tablet**: Collapsible sidebar, adapted layouts
- **Mobile**: Hamburger menu, stacked cards instead of tables, scrollable charts, touch-friendly controls

---

## ACCESSIBILITY

- Keyboard navigation on all interactive elements
- Visible focus states (outline)
- Sufficient contrast (WCAG AA)
- Semantic HTML (nav, main, section, article, button, table)
- Accessible labels on form controls
- ARIA attributes where needed
- Never rely on color alone (always pair with text/icons)

---

## VERIFICATION

After building:
1. Run `npm install`
2. Run `npm run dev`
3. Verify the app loads at localhost:5173
4. Verify sidebar navigation works
5. Verify empty states render
6. Verify API calls are made (even if backend isn't running, errors should show cleanly)
