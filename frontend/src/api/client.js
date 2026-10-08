const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function apiRequest(method, path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // Attempt to parse JSON safely
    let data;
    try {
      data = await res.json();
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      return null;
    }

    if (!data.success && !res.ok) {
      throw new Error(data.error?.message || data.message || 'Something went wrong. Please try again.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Network error. Please try again.');
  }
}

export const api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  put: (path, body) => apiRequest('PUT', path, body),
  patch: (path, body) => apiRequest('PATCH', path, body),
  delete: (path) => apiRequest('DELETE', path),
};
