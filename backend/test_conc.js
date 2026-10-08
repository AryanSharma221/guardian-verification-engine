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
    const apps = await apiRequest('GET', '/applications');
    const appId = apps.data[0].id;

    console.log('Testing Safe mode (Concurrency = 5)...');
    const safeRes = await apiRequest('POST', '/test-runs/concurrency', {
       application_id: appId,
       options: { workflow: 'Book Appointment', concurrency: 5, safe: true }
    });
    console.log('Safe test result:', safeRes.data.results[0].finding ? 'CRITICAL' : 'PASS');

    console.log('Testing Race Condition mode (Concurrency = 5)...');
    const raceRes = await apiRequest('POST', '/test-runs/concurrency', {
       application_id: appId,
       options: { workflow: 'Book Appointment', concurrency: 5, safe: false }
    });
    console.log('Race condition result:', raceRes.data.results[0].finding ? 'CRITICAL' : 'PASS');

    console.log('Testing Rate Limit (Concurrency = 20)...');
    try {
      await apiRequest('POST', '/test-runs/concurrency', {
         application_id: appId,
         options: { workflow: 'Book Appointment', concurrency: 20, safe: false }
      });
      console.log('Rate limit: FAIL (Allowed through)');
    } catch (e) {
      console.log('Rate limit: BLOCKED (' + e.message + ')');
    }

  } catch(e) {
    console.error('Test FAIL:', e);
  }
}
run();
