import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import ErrorMessage from '../components/common/ErrorMessage';
import ProgressBar from '../components/common/ProgressBar';
import EmptyState from '../components/common/EmptyState';
import { Search, Server, FileJson, Users, Workflow, CheckCircle, RotateCcw } from 'lucide-react';

export default function Discovery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, running, complete, error
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const startDiscovery = async () => {
    setStatus('running');
    setProgress(10);
    setCurrentStep('Discovering application...');
    setError(null);
    try {
      // Simulate progress for UX
      const steps = [
        { p: 30, text: 'Mapping roles...' },
        { p: 50, text: 'Mapping entities...' },
        { p: 70, text: 'Mapping workflows...' },
        { p: 90, text: 'Analyzing endpoints...' }
      ];
      
      let stepIdx = 0;
      const interval = setInterval(() => {
        if (stepIdx < steps.length) {
          setProgress(steps[stepIdx].p);
          setCurrentStep(steps[stepIdx].text);
          stepIdx++;
        }
      }, 800);

      const res = await api.post(`/applications/${id}/discovery`);
      clearInterval(interval);
      setProgress(100);
      setCurrentStep('Building application map...');
      setTimeout(() => {
        setResults(res.data);
        setStatus('complete');
      }, 500);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (status === 'idle') {
    return (
      <EmptyState 
        title="Application Discovery"
        description="Guardian needs to analyze your application's endpoints, roles, entities, and workflows to build an intelligent test plan."
        actionText="Start Discovery"
        onAction={startDiscovery}
        icon={Search}
      />
    );
  }

  if (status === 'running') {
    return (
      <div className="max-w-2xl mx-auto py-12 mt-12 card text-center">
        <Search className="w-12 h-12 text-primary animate-pulse mx-auto mb-6" />
        <h2 className="text-xl font-semibold mb-2">Analyzing Application</h2>
        <p className="text-text-secondary mb-8">{currentStep}</p>
        <ProgressBar progress={progress} />
        <p className="text-xs text-text-muted mt-4">{progress}% Complete</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4 text-critical">Discovery Failed</h1>
        <ErrorMessage message={error} />
        <button onClick={startDiscovery} className="btn-primary mt-6">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            Discovery Complete 
            <CheckCircle className="w-6 h-6 text-success ml-2" />
          </h1>
          {results?.is_simulated && (
            <span className="inline-block mt-2 text-xs font-medium bg-info-light text-info px-2 py-1 rounded">DEMO / SIMULATED DATA</span>
          )}
        </div>
        <div className="space-x-3">
          <button onClick={startDiscovery} className="btn-secondary flex items-center">
            <RotateCcw className="w-4 h-4 mr-2" /> Retry
          </button>
          <button onClick={() => navigate(`/applications/${id}/test-plan`)} className="btn-primary">
            View Test Plan
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {!results || !results.endpoints || results.endpoints.length === 0 ? (
        <div className="max-w-2xl mx-auto py-12 text-center card mt-6">
          <Search className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No reachable application surface was found.</h2>
          <p className="text-text-secondary mb-6">Discovery returned zero items. The application might be unreachable, or authentication is blocking access.</p>
          <div className="flex justify-center space-x-4">
            <button onClick={startDiscovery} className="btn-secondary">Retry Discovery</button>
            <button onClick={() => navigate('/applications/new')} className="btn-secondary">Edit Application</button>
            <button onClick={() => navigate('/applications/new')} className="btn-primary">Provide API Specification</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Endpoints" value={results.endpoints.length} icon={Server} />
          <StatCard title="Entities" value={results.entities?.length || 0} icon={FileJson} />
          <StatCard title="Roles" value={results.roles?.length || 0} icon={Users} />
          <StatCard title="Workflows" value={results.critical_workflows?.length || 0} icon={Workflow} />
        </div>
      )}

      {results && (
        <div className="card mt-6">
           <h3 className="text-lg font-semibold mb-4">Discovery Confidence</h3>
           <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Endpoint Coverage</span>
                  <span className="font-medium">{results?.confidence?.endpoints || 0}%</span>
                </div>
                <ProgressBar progress={results?.confidence?.endpoints || 0} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Model Accuracy</span>
                  <span className="font-medium">{results?.confidence?.model || 0}%</span>
                </div>
                <ProgressBar progress={results?.confidence?.model || 0} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="card flex items-center p-6">
      <div className="p-3 rounded-full bg-primary-light mr-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="text-text-secondary text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
