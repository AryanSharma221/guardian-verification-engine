import React, { useState, useEffect } from 'react';
import { Play, AlertTriangle, ArrowRight, Server, ShieldAlert, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { useNavigate } from 'react-router-dom';

export default function ConcurrencyCenter() {
  const [concurrency, setConcurrency] = useState(5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxConcurrency, setMaxConcurrency] = useState(10);
  const [safeMode, setSafeMode] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const appId = localStorage.getItem('guardian_current_app_id');
        if (!appId) throw new Error("No application selected.");

        const [discoveryRes, safetyRes, latestRunRes] = await Promise.all([
          api.get(`/applications/${appId}/discovery`),
          api.get(`/applications/${appId}/safety`),
          api.get(`/applications/${appId}/test-runs`)
        ]);

        const discoveredWorkflows = discoveryRes.data?.critical_workflows || [];
        setWorkflows(discoveredWorkflows);
        if (discoveredWorkflows.length > 0) {
          setSelectedWorkflow(discoveredWorkflows[0].name);
        }

        if (safetyRes.data) {
          setMaxConcurrency(safetyRes.data.max_concurrency);
        }
        
        // Find latest concurrency run to persist state
        if (latestRunRes.data?.data) {
          const concRuns = latestRunRes.data.data.filter(r => r.profile === 'concurrency' && r.status === 'completed');
          if (concRuns.length > 0) {
             const run = concRuns[0];
             // Try to fetch result
             try {
                const runDetail = await api.get(`/test-runs/${run.id}`);
                if (runDetail.data?.test_results?.length > 0) {
                   const tr = runDetail.data.test_results[0];
                   const evidence = JSON.parse(tr.actual_result || '{}');
                   const finding = tr.status === 'failed';
                   setResult({ finding, evidence });
                }
             } catch (e) {
                console.log("Failed to load past test result");
             }
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const runTest = async () => {
    const requestedConcurrency = parseInt(concurrency);
    
    // Front-end validation (as requested: "Frontend validation must not be the only protection.")
    if (isNaN(requestedConcurrency) || requestedConcurrency < 2) {
      setError("Concurrency must be at least 2.");
      return;
    }
    
    setRunning(true);
    setResult(null);
    setError(null);
    
    try {
      const appId = localStorage.getItem('guardian_current_app_id');
      const res = await api.post('/test-runs/concurrency', {
        application_id: appId,
        options: {
          workflow: selectedWorkflow,
          concurrency: requestedConcurrency,
          safe: safeMode
        }
      });
      
      const testResult = res.data.results[0];
      setResult(testResult);
      
    } catch (err) {
      setError(err.message || 'Execution failed.');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <LoadingSkeleton count={1} type="chart" />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Concurrency Center</h1>
        <p className="text-text-secondary">Identify race conditions and state management flaws.</p>
      </div>

      {error && (
        <div className="mb-6">
          <div className="p-4 bg-warning-light text-warning border border-warning/20 rounded-md flex items-center">
             <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
             <span className="font-medium">BLOCKED: {error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1 space-y-6">
          <h3 className="text-lg font-semibold">Test Configuration</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Critical Operation</label>
            <select 
              className="input-field"
              value={selectedWorkflow}
              onChange={e => setSelectedWorkflow(e.target.value)}
            >
              {workflows.map((w, i) => (
                <option key={i} value={w.name}>{w.name}</option>
              ))}
              {workflows.length === 0 && <option value="Generic">Generic Workflow</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Concurrency Level ({concurrency} threads)</label>
            <input 
              type="number" 
              min="2" 
              value={concurrency} 
              onChange={(e) => setConcurrency(e.target.value)} 
              className="input-field mb-2" 
            />
            <p className="text-xs text-text-muted">Safety Limit: {maxConcurrency} max</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="safeMode" checked={safeMode} onChange={e => setSafeMode(e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
            <label htmlFor="safeMode" className="text-sm font-medium">Safe Mode (Simulate Protection)</label>
          </div>

          <button onClick={runTest} disabled={running} className="btn-primary w-full flex justify-center items-center">
            {running ? 'Executing...' : <><Play className="w-4 h-4 mr-2" /> Run Concurrency Test</>}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {running && (
            <div className="card h-64 flex flex-col items-center justify-center text-center">
               <Server className="w-12 h-12 text-primary animate-pulse mb-4" />
               <h3 className="text-lg font-medium">Executing Concurrency Test</h3>
               <p className="text-sm text-text-secondary mt-2">Sending {concurrency} synchronized requests...</p>
            </div>
          )}

          {!running && result && result.evidence && (
            <div className="space-y-6">
              <div className="card border-l-4 border-l-primary flex items-start p-4 bg-primary-light/10">
                {result.finding ? (
                   <ShieldAlert className="w-6 h-6 text-critical mr-4 flex-shrink-0 mt-1" />
                ) : (
                   <CheckCircle className="w-6 h-6 text-success mr-4 flex-shrink-0 mt-1" />
                )}
                <div>
                  <h3 className="text-lg font-bold">
                    {result.finding ? 'CRITICAL: Data Integrity Failure' : 'PASS: Safe Execution'}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {result.finding 
                      ? 'Race condition detected. Multiple requests successfully modified state incorrectly.' 
                      : 'Concurrency protection successfully prevented race condition.'}
                  </p>
                </div>
                {result.finding && (
                  <button 
                    onClick={() => navigate(`/findings`)} 
                    className="ml-auto btn-secondary text-sm"
                  >
                    View Finding
                  </button>
                )}
              </div>

              <div className="card">
                <h3 className="text-md font-semibold mb-4">Execution Timeline</h3>
                
                <div className="flex justify-between items-center mb-6 p-4 bg-background rounded-md border border-border">
                   <div className="text-center">
                     <p className="text-xs text-text-secondary uppercase">Initial State</p>
                     <p className="font-mono text-sm mt-1">slots: {result.evidence.initial_state?.available_slots}</p>
                   </div>
                   <ArrowRight className="text-text-muted" />
                   <div className="text-center">
                     <p className="text-xs text-text-secondary uppercase">Outcome</p>
                     <p className="font-mono text-sm mt-1">{result.evidence.successful_responses} succeeded</p>
                   </div>
                   <ArrowRight className="text-text-muted" />
                   <div className="text-center">
                     <p className="text-xs text-text-secondary uppercase">Final State</p>
                     <p className={`font-mono text-sm mt-1 ${result.evidence.final_state?.available_slots < 0 ? 'text-critical' : 'text-success'}`}>
                       slots: {result.evidence.final_state?.available_slots}
                     </p>
                   </div>
                </div>

                <div className="space-y-3 overflow-x-auto">
                  {result.evidence.timeline?.map((event, idx) => (
                    <div key={idx} className="flex items-center text-sm p-2 hover:bg-background rounded-md transition-colors min-w-max">
                      <div className="w-20 font-mono text-text-muted">T+{event.t}ms</div>
                      <div className="w-48 font-medium">{event.action}</div>
                      <div className="flex-1 font-mono text-xs truncate">
                        {event.state_read ? `Read: ${event.state_read}` : `Write: ${event.new_state}`}
                      </div>
                      <div className={`w-24 text-right ${event.status === 'success' ? 'text-success' : 'text-warning'}`}>
                        {event.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {!running && !result && (
            <div className="card h-64 flex flex-col items-center justify-center text-center text-text-muted border-dashed">
               <p>Configure test parameters and click Run</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
