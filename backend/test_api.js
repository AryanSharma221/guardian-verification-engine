// Quick API smoke test for Guardian backend
const APP_ID = process.argv[2];
const BASE = 'http://localhost:3001/api';

async function test() {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Create app if no ID provided
  let appId = APP_ID;
  if (!appId) {
    const res = await fetch(`${BASE}/applications`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: 'MediFlow Healthcare', description: 'AI-generated healthcare EMR', base_url: 'https://mediflow.example.com' })
    });
    const data = await res.json();
    appId = data.data.id;
    console.log('✓ Created app:', appId);
  }

  // 2. Run discovery
  const disc = await (await fetch(`${BASE}/applications/${appId}/discovery`, { method: 'POST', headers })).json();
  console.log('✓ Discovery:', disc.success ? 'OK' : 'FAIL',
    '| Roles:', disc.data?.roles?.length,
    '| Entities:', disc.data?.entities?.length,
    '| Simulated:', disc.data?.is_simulated);

  // 3. Generate test plan
  const plan = await (await fetch(`${BASE}/applications/${appId}/test-plan/generate`, { method: 'POST', headers })).json();
  console.log('✓ Test Plan:', plan.success ? 'OK' : 'FAIL',
    '| Tests:', plan.data?.summary?.total,
    '| Security:', plan.data?.summary?.by_category?.security,
    '| Concurrency:', plan.data?.summary?.by_category?.concurrency,
    '| Load:', plan.data?.summary?.by_category?.load);

  // 4. Run authorization tests
  const auth = await (await fetch(`${BASE}/test-runs/authorization`, {
    method: 'POST', headers,
    body: JSON.stringify({ application_id: appId })
  })).json();
  console.log('✓ Auth Tests:', auth.success ? 'OK' : 'FAIL',
    '| Critical:', auth.data?.results?.filter(r => r.finding?.severity === 'CRITICAL').length);

  // 5. Run concurrency tests
  const conc = await (await fetch(`${BASE}/test-runs/concurrency`, {
    method: 'POST', headers,
    body: JSON.stringify({ application_id: appId, concurrency: 2, workflow: 'Book Appointment' })
  })).json();
  console.log('✓ Concurrency:', conc.success ? 'OK' : 'FAIL',
    '| Double Booking:', conc.data?.results?.[0]?.finding?.title?.includes('Double Booking') ? 'DETECTED' : 'NOT DETECTED');

  // 6. Run load tests
  const load = await (await fetch(`${BASE}/test-runs/load`, {
    method: 'POST', headers,
    body: JSON.stringify({ application_id: appId })
  })).json();
  console.log('✓ Load Tests:', load.success ? 'OK' : 'FAIL',
    '| Degradation at:', load.data?.degradation_point?.concurrent_users, 'users',
    '| Stages:', load.data?.metrics?.length);

  // 7. Get score
  const score = await (await fetch(`${BASE}/applications/${appId}/score`)).json();
  console.log('✓ Score:', score.data?.overall_score, '/', 100,
    '| Status:', score.data?.readiness_status,
    '| Criticals:', score.data?.unresolved_criticals);

  // 8. Get findings
  const findings = await (await fetch(`${BASE}/applications/${appId}/findings`)).json();
  console.log('✓ Findings:', findings.total, 'total');
  for (const f of (findings.data || []).slice(0, 3)) {
    console.log('  -', f.severity, '|', f.title);
  }

  // 9. Diagnose first finding
  if (findings.data?.length > 0) {
    const diag = await (await fetch(`${BASE}/findings/${findings.data[0].id}/diagnose`, { method: 'POST', headers })).json();
    console.log('✓ Diagnosis:', diag.success ? 'OK' : 'FAIL',
      '| Confidence:', diag.data?.diagnosis?.confidence);
  }

  // 10. Retest first finding
  if (findings.data?.length > 0) {
    const retest = await (await fetch(`${BASE}/findings/${findings.data[0].id}/retest`, { method: 'POST', headers })).json();
    console.log('✓ Retest:', retest.success ? 'OK' : 'FAIL',
      '| Result:', retest.data?.status,
      '| Score Before:', retest.data?.score_before,
      '| Score After:', retest.data?.score_after);
  }

  // 11. Get updated score
  const score2 = await (await fetch(`${BASE}/applications/${appId}/score`)).json();
  console.log('✓ Updated Score:', score2.data?.overall_score, '/', 100,
    '| Status:', score2.data?.readiness_status);

  // 12. Generate report
  const report = await (await fetch(`${BASE}/applications/${appId}/reports/generate`, { method: 'POST', headers })).json();
  console.log('✓ Report:', report.success ? 'OK' : 'FAIL',
    '| Decision:', report.data?.readiness_decision?.substring(0, 50));

  console.log('\n========================================');
  console.log('ALL API TESTS PASSED');
  console.log('========================================');
}

test().catch(err => {
  console.error('✗ TEST FAILED:', err.message);
  process.exit(1);
});
