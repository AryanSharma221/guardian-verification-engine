# Guardian AI Verification Engine 🛡️

**Guardian** is an autonomous AI-Powered Production Readiness & Adversarial Verification Engine. 

Traditional CI/CD pipelines move faster than security teams can audit. While standard scanners catch syntax flaws or known CVEs, they entirely miss complex business logic vulnerabilities, race conditions, and Broken Object Level Authorization (BOLA/IDOR) flaws. Guardian solves this by acting as an autonomous red-team—actively attacking, stressing, and diagnosing your live staging environments just like a human engineer would.

---

## 🚀 Features

Guardian operates on a comprehensive 6-stage autonomous pipeline:

1. **Discovery & Mapping**: Ingests API specs or crawls the application to build an internal state map, understanding user roles, entities, and complex API workflows.
2. **AI Test Plan Synthesis**: Generates highly specific adversarial scenarios based on the application's actual business logic rather than using generic payload fuzzing.
3. **Active Execution Engine**: Fires heavily concurrent payloads against the staging environment. Uses HTTP keep-alive and `Promise.all` bursts to induce race conditions and stresses database locks.
4. **AI Diagnosis**: Analyzes raw HTTP traces from failed tests. The AI Engine diagnoses the exact root cause, severity, and business impact of the vulnerability.
5. **Auto-Remediation & Retesting**: Generates targeted code patches to mitigate the flaw. Supports closed-loop retesting, re-firing the exact adversarial scenario to mathematically prove the vulnerability is fixed.
6. **Production Readiness Gate**: Aggregates Security, Scalability, Reliability, and Data Integrity metrics into a final 1-100 score. Features a "Critical Override" that blocks deployment if any severe vulnerabilities remain unresolved.

---

## 🛠️ Tech Stack

*   **Frontend**: React, Vite, Tailwind CSS, Recharts, Lucide Icons.
*   **Backend**: Node.js, Express.
*   **Database**: SQLite (`better-sqlite3` for synchronous, high-performance local storage).
*   **Architecture**: Decoupled async background engines (`testRunner`, `scoring`, `diagnosis`).

---

## 🚦 Quickstart

### Prerequisites
*   Node.js (v18+ recommended)
*   Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AryanSharma221/guardian-verification-engine.git
   cd guardian-verification-engine
   ```

2. **Start the Backend**
   ```bash
   cd backend
   npm install
   node server.js
   ```
   *The backend will initialize the SQLite database automatically and bind to `http://localhost:3001`.*

3. **Start the Frontend (in a new terminal)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The frontend will bind to `http://localhost:5173`.*

---

## 📂 Project Structure

```text
guardian/
├── backend/
│   ├── db/                 # SQLite database and setup scripts
│   ├── engines/            # Core autonomous runners (discovery, testRunner, scoring, diagnosis)
│   ├── middleware/         # Express middleware (audit logging, error handling)
│   ├── routes/             # REST API endpoints
│   └── server.js           # Express application entry point
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API client wrapper
│   │   ├── components/     # Reusable UI components (ScoreDisplay, StatusBadge)
│   │   └── pages/          # Application views (Discovery, ActiveTestRun, Findings, Reports)
│   ├── index.html          # Vite entry HTML
│   ├── tailwind.config.js  # Design system configuration
│   └── vite.config.js      # Vite proxy and build configuration
└── specs/                  # Architectural design documents
```

---

## 🔒 Security Notice

**Guardian is an active testing tool designed for staging and pre-production environments.** Do not point Guardian at production databases without explicit authorization, as the Concurrency and Load engines are designed to induce heavy stress and data mutation.

---

## 👨‍💻 Authors

Created by **Aryan Sharma**, **Harnoor Kant**, and **Akshat Shukla**.
