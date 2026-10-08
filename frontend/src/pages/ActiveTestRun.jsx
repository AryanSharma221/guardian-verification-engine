import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import ProgressBar from '../components/common/ProgressBar';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { Pause, Square, Activity, CheckCircle, XCircle, PlayCircle } from 'lucide-react';

export default function ActiveTestRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    const fetchRunDetails = async () => {
      try {
        const res = await api.get(`/test-runs/${id}`);
        setRun(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRunDetails();
    // Poll if still running
    interval = setInterval(() => {
      if (run && (run.status === 'RUNNING' || run.status === 'PENDING')) {
        fetchRunDetails();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, run?.status]);

  if (loading) return <LoadingSkeleton count={3} />;
  if (error) return <ErrorMessage message={error} />;
  if (!run) return <ErrorMessage message="Test run not found" />;

  const handleAction = async (action) => {
    try {
      await api.post(`/test-runs/${id}/${action}`);
      const res = await api.get(`/test-runs/${id}`);
      setRun(res.data);
    } catch (e) {
      setError(e.message);
    }
  };

  let summary = run.summary || {};
  if (typeof summary === 'string') {
    try { summary = JSON.parse(summary); } catch (e) { summary = {}; }
  }

  const progress = summary.progress_percentage || 0;
  const requests = summary.total_tests || 0;
  const passed = summary.passed || 0;
  const failed = summary.failed || 0;
  const remaining = summary.remaining || 0;
  const elapsed = summary.elapsed_time || '00:00';
  const currentTest = summary.current_test || 'Waiting...';
  const isRunning = run.status === 'RUNNING' || run.status === 'PENDING';
  const isPaused = run.status === 'PAUSED' || run.status === 'paused';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold">Active Test Run #{id.slice(0, 8)}</h1>
          <p className="text-text-secondary mt-1">Profile: {run.profile || 'Standard Suite'} • Elapsed: {elapsed}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className="card">
        <div className="flex justify-between mb-2 text-sm font-medium">
          <span>Overall Progress - {currentTest}</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar progress={progress} color={run.status === 'FAILED' ? 'bg-critical' : 'bg-primary'} />
        
        <div className="flex justify-between mt-4 text-xs text-text-secondary">
          <span>{passed + failed} Completed</span>
          <span>{remaining} Remaining</span>
        </div>

        {run.status === 'COMPLETED' && (
          <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
            <div>
              <span className="text-text-secondary text-sm">Final Score: </span>
              <span className={`text-2xl font-bold ${run.score < 80 ? 'text-critical' : 'text-success'}`}>{run.score}</span>
            </div>
            <button onClick={() => navigate(`/applications/${run.application_id}/findings`)} className="btn-primary">
              View Findings
            </button>
          </div>
        )}

        {(isRunning || isPaused) && (
          <div className="flex justify-end space-x-3 mt-6">
            {isRunning ? (
              <button onClick={() => handleAction('pause')} className="btn-secondary text-warning hover:bg-warning-light border-warning flex items-center">
                <Pause className="w-4 h-4 mr-2" /> Pause
              </button>
            ) : (
              <button onClick={() => handleAction('resume')} className="btn-secondary text-success hover:bg-success-light border-success flex items-center">
                <PlayCircle className="w-4 h-4 mr-2" /> Resume
              </button>
            )}
            <button onClick={() => handleAction('stop')} className="btn-secondary text-critical hover:bg-critical-light border-critical flex items-center">
              <Square className="w-4 h-4 mr-2" /> Stop
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Tests" value={requests.toLocaleString()} />
        <MetricCard label="Remaining" value={remaining.toString()} />
        <MetricCard label="Passed Tests" value={passed.toLocaleString()} icon={CheckCircle} color="text-success" />
        <MetricCard label="Failed Tests" value={failed.toLocaleString()} icon={XCircle} color="text-critical" />
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className={`w-5 h-5 mr-2 ${(isRunning || isPaused) ? 'text-primary animate-pulse' : 'text-text-muted'}`} /> 
          Test Results & Logs
        </h3>
        <div className="bg-background rounded-md p-4 font-mono text-xs overflow-y-auto h-64 border border-border">
          {run.test_results && run.test_results.length > 0 ? (
            run.test_results.map((tr, idx) => {
              const ev = JSON.parse(tr.actual_result || '{}');
              return (
                <div key={idx} className={`mb-1 ${tr.status.toLowerCase() === 'failed' ? 'text-critical' : tr.status.toLowerCase() === 'passed' ? 'text-success' : 'text-text-secondary'}`}>
                  [{new Date(tr.completed_at || Date.now()).toLocaleTimeString()}] TEST {tr.test_id.slice(0, 8)}: {tr.status.toUpperCase()} {ev.status_code ? `(HTTP ${ev.status_code})` : ''}
                </div>
              );
            })
          ) : (
            <div className="text-text-secondary">No detailed test results available yet. Waiting for tests to complete...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color = 'text-text-primary' }) {
  return (
    <div className="card flex flex-col items-center justify-center py-6 text-center">
       {Icon && <Icon className={`w-6 h-6 mb-2 ${color}`} />}
       <p className={`text-2xl font-bold ${color}`}>{value}</p>
       <p className="text-sm text-text-secondary mt-1">{label}</p>
    </div>
  );
}
