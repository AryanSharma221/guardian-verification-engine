const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../middleware/auditLogger');
const { LOAD_STAGES } = require('../utils/constants');

/**
 * Progressive Load Test Engine.
 * Incrementally increases concurrent users to find the degradation point.
 * Demo mode provides deterministic simulated metrics.
 */

/**
 * Deterministic demo load metrics for each stage.
 */
const DEMO_METRICS = {
  10:   { avg: 180,  p95: 220,   p99: 280,   successRate: 100,    throughput: 55 },
  25:   { avg: 195,  p95: 240,   p99: 310,   successRate: 100,    throughput: 128 },
  50:   { avg: 220,  p95: 310,   p99: 420,   successRate: 100,    throughput: 227 },
  100:  { avg: 290,  p95: 480,   p99: 650,   successRate: 99.8,   throughput: 345 },
  250:  { avg: 620,  p95: 1100,  p99: 1800,  successRate: 98.5,   throughput: 403 },
  500:  { avg: 1900, p95: 3200,  p99: 4500,  successRate: 91.1,   throughput: 269 },
  1000: { avg: 4700, p95: 7800,  p99: 12100, successRate: 72.4,   throughput: 153 },
};

/**
 * Run progressive load tests.
 */
function runLoadTests(applicationId, options = {}) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  if (!app) throw new Error('Application not found');

  const maxUsers = options.max_users || 1000;
  const thresholdLatency = options.threshold_latency_ms || 1000;
  const thresholdErrorRate = options.threshold_error_rate || 1.0;
  const ts = new Date().toISOString();

  // Safety check
  const safety = db.prepare('SELECT * FROM safety_settings WHERE application_id = ?').get(applicationId);
  const maxConcurrency = safety?.max_concurrency || 1000;

  const plan = db.prepare("SELECT * FROM test_plans WHERE application_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1")
    .get(applicationId);

  // Create test run
  const runId = uuidv4();
  db.prepare(`
    INSERT INTO test_runs (id, application_id, test_plan_id, profile, status, started_at, is_simulated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(runId, applicationId, plan?.id || null, 'load', 'running', ts, 1);

  logAudit(applicationId, 'test_run.started', 'test_run', runId, { profile: 'load', maxUsers });

  db.prepare("UPDATE applications SET status = 'testing', updated_at = ? WHERE id = ?").run(ts, applicationId);

  // Run through stages
  const stages = LOAD_STAGES.filter(s => s <= Math.min(maxUsers, maxConcurrency));
  const metricsResults = [];
  let degradationPoint = null;

  const insertMetric = db.prepare(`
    INSERT INTO test_metrics (id, test_run_id, stage, concurrency, total_requests, successful_requests, failed_requests, timeout_requests, average_latency, p95_latency, p99_latency, throughput, error_rate, is_degradation_point, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < stages.length; i++) {
    const users = stages[i];
    const metrics = DEMO_METRICS[users];
    if (!metrics) continue;

    const totalRequests = users * 10;
    const successRate = metrics.successRate;
    const errorRate = 100 - successRate;
    const successful = Math.round(totalRequests * successRate / 100);
    const failed = Math.round(totalRequests * errorRate / 100 * 0.7);
    const timeout = totalRequests - successful - failed;

    const isDegradation = !degradationPoint &&
      (metrics.avg > thresholdLatency || errorRate > thresholdErrorRate);

    if (isDegradation) {
      degradationPoint = {
        stage: i + 1,
        concurrent_users: users,
        average_latency: metrics.avg,
        error_rate: errorRate,
        reason: metrics.avg > thresholdLatency
          ? `Average latency (${metrics.avg}ms) exceeded threshold (${thresholdLatency}ms)`
          : `Error rate (${errorRate.toFixed(1)}%) exceeded threshold (${thresholdErrorRate}%)`,
      };
    }

    const metricId = uuidv4();
    insertMetric.run(
      metricId, runId, i + 1, users,
      totalRequests, successful, failed, timeout,
      metrics.avg, metrics.p95, metrics.p99,
      metrics.throughput, errorRate,
      isDegradation ? 1 : 0, ts
    );

    metricsResults.push({
      id: metricId,
      stage: i + 1,
      concurrent_users: users,
      total_requests: totalRequests,
      successful_requests: successful,
      failed_requests: failed,
      timeout_requests: timeout,
      average_latency: metrics.avg,
      p95_latency: metrics.p95,
      p99_latency: metrics.p99,
      throughput: metrics.throughput,
      error_rate: parseFloat(errorRate.toFixed(1)),
      is_degradation_point: isDegradation,
    });
  }

  // Create finding for degradation
  let finding = null;
  if (degradationPoint) {
    const findingId = uuidv4();
    const resultId = uuidv4();

    db.prepare(`
      INSERT INTO test_results (id, test_run_id, test_id, status, expected_result, actual_result, severity, summary, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resultId, runId, null, 'failed',
      `Maintain <${thresholdLatency}ms latency and <${thresholdErrorRate}% error rate across all load stages`,
      `Degradation detected at ${degradationPoint.concurrent_users} users: ${degradationPoint.reason}`,
      'HIGH',
      `Application degrades at ${degradationPoint.concurrent_users} concurrent users. ${degradationPoint.reason}.`,
      ts, ts
    );

    db.prepare(`
      INSERT INTO findings (id, application_id, test_run_id, test_result_id, category, severity, title, description, evidence, impact, root_cause, recommendation, confidence, status, is_simulated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      findingId, applicationId, runId, resultId,
      'scalability', 'HIGH',
      `Performance Degradation at ${degradationPoint.concurrent_users} Concurrent Users`,
      `Progressive load testing identified a degradation point at ${degradationPoint.concurrent_users} concurrent users. ${degradationPoint.reason}. Beyond this threshold, response times increase significantly and error rates rise, indicating the application cannot handle the expected production load.`,
      JSON.stringify({ degradation_point: degradationPoint, stages: metricsResults }),
      `The application will become unreliable under production traffic levels exceeding ${degradationPoint.concurrent_users} concurrent users. Users will experience slow page loads, timeouts, and failed requests during peak usage.`,
      'Probable causes include: unoptimized database queries without proper indexing, lack of connection pooling, synchronous I/O operations blocking the event loop, absence of caching for frequently accessed data, or insufficient server resources for the expected load.',
      'Consider the following optimizations:\n1. Add database query caching (Redis) for frequently accessed data\n2. Implement connection pooling for database connections\n3. Add database indexes on frequently queried columns\n4. Move long-running operations to background job queues\n5. Implement horizontal scaling with load balancing\n6. Add CDN caching for static assets\n7. Profile and optimize the slowest database queries',
      'likely',
      'open', 1, ts
    );

    // Evidence
    db.prepare(`
      INSERT INTO evidence (id, finding_id, test_result_id, request, response, status_code, timestamp, latency, test_configuration, execution_timeline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), findingId, resultId,
      JSON.stringify({ type: 'progressive_load', stages: stages.length }),
      JSON.stringify({ degradation_point: degradationPoint, metrics_summary: metricsResults }),
      null, ts, degradationPoint.average_latency,
      JSON.stringify({ max_users: maxUsers, threshold_latency: thresholdLatency, threshold_error_rate: thresholdErrorRate, stages }),
      JSON.stringify(metricsResults.map((m, idx) => ({
        t_ms: idx * 30000,
        event: `Stage ${m.stage}: ${m.concurrent_users} users → ${m.average_latency}ms avg, ${m.error_rate}% errors`,
        status: m.is_degradation_point ? 'DEGRADATION_POINT' : 'OK',
      })))
    );

    finding = { id: findingId, severity: 'HIGH', title: `Performance Degradation at ${degradationPoint.concurrent_users} Concurrent Users` };
    logAudit(applicationId, 'finding.created', 'finding', findingId, { severity: 'HIGH', type: 'load_degradation' });
  }

  // Complete run
  const completedAt = new Date().toISOString();
  db.prepare(`
    UPDATE test_runs SET status = 'completed', completed_at = ?,
    summary = ? WHERE id = ?
  `).run(
    completedAt,
    JSON.stringify({
      total_stages: metricsResults.length,
      degradation_point: degradationPoint,
      max_throughput: Math.max(...metricsResults.map(m => m.throughput)),
      finding: finding ? finding.id : null,
    }),
    runId
  );

  logAudit(applicationId, 'test_run.completed', 'test_run', runId);

  return {
    run_id: runId,
    status: 'completed',
    metrics: metricsResults,
    degradation_point: degradationPoint,
    finding,
    is_simulated: true,
  };
}

module.exports = { runLoadTests };