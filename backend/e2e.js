const API_BASE = 'http://localhost:3001/api';

async function apiRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success && !res.ok) {
    throw new Error(data.error?.message || data.message || 'Error');
  }
  return data;
}

async function run() {
  try {
    console.log('1. Creating app...');
    const app = await apiRequest('POST', '/applications', { name: 'E2E App', base_url: 'http://e2e.test' });
    const appId = app.data.id;
    console.log('App ID:', appId);

    console.log('2. Running discovery...');
    await apiRequest('POST', `/applications/${appId}/discovery`);
    
    console.log('3. Generating test plan...');
    const plan = await apiRequest('POST', `/applications/${appId}/test-plan/generate`);
    console.log('Tests generated:', plan.data.summary.total);

    console.log('4. Creating test run...');
    const runResult = await apiRequest('POST', '/test-runs', { application_id: appId });
    console.log('Test run completed.');

    console.log('5. Fetching findings...');
    const findings = await apiRequest('GET', `/applications/${appId}/findings`);
    console.log('Findings:', findings.data.length);
    
    if (findings.data.length > 0) {
      const findingId = findings.data[0].id;
      console.log('6. Diagnosing finding', findingId, '...');
      const diag = await apiRequest('POST', `/findings/${findingId}/diagnose`);
      console.log('Diagnosis confidence:', diag.data.confidence);
      
      console.log('7. Retesting finding...');
      const retest = await apiRequest('POST', `/findings/${findingId}/retest`);
      console.log('Retest result:', retest.data.status);
    }

    console.log('8. Generating report...');
    const report = await apiRequest('POST', `/applications/${appId}/reports/generate`);
    console.log('Report score:', report.data.overall_score);

    console.log('E2E PASS');
  } catch(e) {
    console.error('E2E FAIL:', e);
  }
}
run();
