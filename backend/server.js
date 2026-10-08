require('dotenv').config();
const express = require('express');
const cors = require('cors');
const setupDatabase = require('./db/setup');
const errorHandler = require('./middleware/errorHandler');
const auditMiddleware = require('./middleware/auditLogger');

// Initialize database
setupDatabase();

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(auditMiddleware);

// Route imports
const applicationsRouter = require('./routes/applications');
const testPlansRouter = require('./routes/testPlans');
const testsRouter = require('./routes/tests');
const testRunsRouter = require('./routes/testRuns');
const findingsRouter = require('./routes/findings');
const remediationsRouter = require('./routes/remediations');
const retestsRouter = require('./routes/retests');
const evidenceRouter = require('./routes/evidence');
const safetyRouter = require('./routes/safety');
const reportsRouter = require('./routes/reports');
const auditRouter = require('./routes/audit');
const scoringRouter = require('./routes/scoring');

// ============================================================
// Global routes
// ============================================================
app.use('/api/applications', applicationsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/test-runs', testRunsRouter);
app.use('/api/audit', auditRouter);

// ============================================================
// Application-scoped routes (nested under /api/applications/:id)
// ============================================================
app.use('/api/applications/:id/test-plan', testPlansRouter);
app.use('/api/applications/:id/test-runs', testRunsRouter);
app.use('/api/applications/:id/findings', findingsRouter);
app.use('/api/applications/:id/safety', safetyRouter);
app.use('/api/applications/:id/reports', reportsRouter);
app.use('/api/applications/:id/audit', auditRouter);
app.use('/api/applications/:id/score', scoringRouter);

// ============================================================
// Finding-scoped routes
// ============================================================
app.use('/api/findings', findingsRouter);
app.use('/api/findings/:findingId/remediation', remediationsRouter);
app.use('/api/findings/:findingId/retest', retestsRouter);
app.use('/api/findings/:findingId/evidence', evidenceRouter);

// ============================================================
// Other entity routes
// ============================================================
app.use('/api/remediations', remediationsRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/test-results/:resultId/evidence', evidenceRouter);

// ============================================================
// Error handler (must be last)
// ============================================================
app.use(errorHandler);

// ============================================================
// Start server
// ============================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Guardian] Server running on port ${PORT}`);
  console.log(`[Guardian] API available at http://localhost:${PORT}/api`);
});