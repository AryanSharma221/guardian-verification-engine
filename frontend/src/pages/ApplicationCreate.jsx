import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import ErrorMessage from '../components/common/ErrorMessage';

export default function ApplicationCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', description: '', baseUrl: '', apiSpec: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (formData.baseUrl) {
      try {
        new URL(formData.baseUrl);
      } catch (_) {
        setError('Enter a valid application URL.');
        setLoading(false);
        return;
      }
    }
    
    if (!formData.baseUrl && !formData.apiSpec) {
      setError('Provide a valid API specification or application URL.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/applications', {
        name: formData.name,
        description: formData.description,
        base_url: formData.baseUrl,
        api_spec: formData.apiSpec
      });
      navigate(`/applications/${res.data.id}/discovery`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Create Application</h1>
      <p className="text-text-secondary mb-6">Register a new application for readiness scanning.</p>

      {error && <div className="mb-6"><ErrorMessage message={error} /></div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Application Name *</label>
            <input 
              required
              type="text" 
              className="input-field" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., MediFlow Healthcare API"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
            <textarea 
              className="input-field h-24" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Core backend services for patient management"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Base URL</label>
            <input 
              type="url" 
              className="input-field" 
              value={formData.baseUrl}
              onChange={e => setFormData({...formData, baseUrl: e.target.value})}
              placeholder="https://api.staging.mediflow.com"
            />
            <p className="text-xs text-text-muted mt-1">Leave blank if discovering via API Spec</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">API Specification (OpenAPI/Swagger)</label>
            <textarea 
              className="input-field h-32 font-mono text-sm" 
              value={formData.apiSpec}
              onChange={e => setFormData({...formData, apiSpec: e.target.value})}
              placeholder="Paste JSON or YAML here..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <button type="button" onClick={() => navigate('/')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center">
              {loading ? 'Creating...' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
