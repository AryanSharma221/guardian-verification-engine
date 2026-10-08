/**
 * Shared constants for the Guardian backend.
 */

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];

const FINDING_CATEGORIES = ['security', 'scalability', 'reliability', 'business_logic', 'data_integrity'];

const FINDING_STATUSES = ['open', 'resolved', 'accepted', 'false_positive'];

const TEST_CATEGORIES = ['security', 'concurrency', 'load'];

const TEST_STATUSES = ['pending', 'running', 'passed', 'failed', 'error', 'blocked', 'paused'];

const RUN_STATUSES = ['pending', 'running', 'completed', 'failed', 'incomplete', 'paused', 'stopped'];

const APP_STATUSES = ['created', 'discovering', 'discovered', 'testing', 'tested'];

const READINESS_STATUSES = ['READY', 'NEEDS_ATTENTION', 'HIGH_RISK', 'PRODUCTION_BLOCKER'];

const CONFIDENCE_LEVELS = ['observed', 'likely', 'probable', 'inferred'];

const REMEDIATION_DECISIONS = ['approved', 'rejected', 'edited'];

const REMEDIATION_STATUSES = ['proposed', 'approved', 'rejected', 'verified'];

// Scoring weights
const SCORE_WEIGHTS = {
  security: 0.30,
  scalability: 0.25,
  reliability: 0.20,
  business_logic: 0.15,
  data_integrity: 0.10,
};

// Severity penalties for scoring
const SEVERITY_PENALTIES = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5,
  INFORMATIONAL: 1,
};

// Load test default stages
const LOAD_STAGES = [10, 25, 50, 100, 250, 500, 1000];

// Audit actions
const AUDIT_ACTIONS = [
  'application.created', 'application.updated',
  'discovery.started', 'discovery.completed', 'discovery.failed', 'discovery.retried',
  'test_plan.generated',
  'test_run.started', 'test_run.completed', 'test_run.paused', 'test_run.stopped',
  'finding.created', 'finding.resolved',
  'diagnosis.generated', 'diagnosis.failed',
  'remediation.created', 'remediation.updated',
  'retest.started', 'retest.completed',
  'safety.updated',
  'report.generated',
  'evidence.replayed',
];

module.exports = {
  SEVERITIES,
  FINDING_CATEGORIES,
  FINDING_STATUSES,
  TEST_CATEGORIES,
  TEST_STATUSES,
  RUN_STATUSES,
  APP_STATUSES,
  READINESS_STATUSES,
  CONFIDENCE_LEVELS,
  REMEDIATION_DECISIONS,
  REMEDIATION_STATUSES,
  SCORE_WEIGHTS,
  SEVERITY_PENALTIES,
  LOAD_STAGES,
  AUDIT_ACTIONS,
};