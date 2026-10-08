import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import { ArrowRight, FilePlus, PlayCircle } from 'lucide-react';

export default function TestRuns() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRuns, setSelectedRuns] = useState([]);

  const appId = localStorage.getItem('guardian_current_app_id') || 1;

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await api.get(`/applications/${appId}/test-runs`);
        setRuns(res.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, [appId]);

  const [compareData, setCompareData] = useState(null);

  const fetchCompare = async () => {
    try {
      const res = await api.post('/test-runs/compare', { run_id_a: selectedRuns[0], run_id_b: selectedRuns[1] });
      setCompareData(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSkeleton count={6} type="list" />;
  
  if (compareData) {
    const { runA, runB } = compareData;
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold">Compare Test Runs</h1>
            <p className="text-text-secondary">Comparing TR-{runA.id.slice(0,8)} vs TR-{runB.id.slice(0,8)}</p>
          </div>
          <button onClick={() => setCompareData(null)} className="btn-secondary">Back to List</button>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-lg mb-4 text-primary">Run A: TR-{runA.id.slice(0,8)}</h3>
            <p className="text-sm text-text-secondary mb-4">{new Date(runA.started_at).toLocaleString()}</p>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-border pb-2">
                <span>Score</span>
                <span className="font-bold">{runA.score || 0}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Total Tests</span>
                <span className="font-bold">{runA.results.length}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Critical Failures</span>
                <span className="font-bold text-critical">{runA.results.filter(r => r.status === 'failed' && r.severity === 'CRITICAL').length}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-lg mb-4 text-primary">Run B: TR-{runB.id.slice(0,8)}</h3>
            <p className="text-sm text-text-secondary mb-4">{new Date(runB.started_at).toLocaleString()}</p>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-border pb-2">
                <span>Score</span>
                <span className="font-bold">{runB.score || 0}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Total Tests</span>
                <span className="font-bold">{runB.results.length}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Critical Failures</span>
                <span className="font-bold text-critical">{runB.results.filter(r => r.status === 'failed' && r.severity === 'CRITICAL').length}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
           <h3 className="font-semibold mb-4">Finding Delta</h3>
           <p className="text-sm text-text-secondary mb-2">Comparing resolved and new findings between runs.</p>
           <div className="bg-background rounded p-4 border border-border">
             <div className="flex justify-between items-center mb-2">
                <span className="text-success font-medium">Resolved in B</span>
                <span>{runA.results.filter(r => r.status === 'failed').length - runB.results.filter(r => r.status === 'failed').length > 0 ? (runA.results.filter(r => r.status === 'failed').length - runB.results.filter(r => r.status === 'failed').length) : 0}</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-critical font-medium">New in B</span>
                <span>{runB.results.filter(r => r.status === 'failed').length - runA.results.filter(r => r.status === 'failed').length > 0 ? (runB.results.filter(r => r.status === 'failed').length - runA.results.filter(r => r.status === 'failed').length) : 0}</span>
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold">Test History</h1>
          <p className="text-text-secondary">Review past executions and compare results.</p>
        </div>
        <button onClick={() => navigate(`/applications/${appId}/test-plan`)} className="btn-primary flex items-center">
          <FilePlus className="w-4 h-4 mr-2" /> New Run
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {runs.length === 0 && !error ? (
        <EmptyState title="No Test Runs" description="You haven't executed any tests yet." actionText="Go to Test Plan" onAction={() => navigate(`/applications/${appId}/test-plan`)} icon={PlayCircle} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
             <div className="text-sm text-text-secondary">{runs.length} runs found</div>
             <button 
               onClick={fetchCompare}
               disabled={selectedRuns.length !== 2}
               className="btn-secondary"
             >
               Compare Selected (Select 2)
             </button>
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-background text-text-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-4 w-12"></th>
                  <th className="px-6 py-4 font-medium">Run ID</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Profile</th>
                  <th className="px-6 py-4 font-medium">Tests Run</th>
                  <th className="px-6 py-4 font-medium text-center">Score</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => {
                  let summary = run.summary;
                  if (typeof summary === 'string') {
                    try { summary = JSON.parse(summary); } catch (e) { summary = {}; }
                  }
                  
                  const testsRun = summary?.total_tests || 0;
                  const passed = summary?.passed || 0;
                  const failed = summary?.failed || 0;
                  const isSelected = selectedRuns.includes(run.id);

                  return (
                    <tr key={run.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-4">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {
                             if (isSelected) {
                               setSelectedRuns(selectedRuns.filter(id => id !== run.id));
                             } else {
                               if (selectedRuns.length < 2) setSelectedRuns([...selectedRuns, run.id]);
                             }
                          }}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-primary">TR-{run.id.slice(0,8)}</td>
                      <td className="px-6 py-4 text-text-secondary">{new Date(run.started_at).toLocaleString()}</td>
                      <td className="px-6 py-4">{run.profile || 'Standard Suite'}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <span className="text-text-primary">{testsRun}</span>
                          <span className="text-text-muted">({passed} ✓, {failed} ✗)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold">{summary?.score || run.score || '-'}</td>
                      <td className="px-6 py-4"><StatusBadge status={run.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => navigate(`/test-runs/${run.id}`)} className="text-primary hover:underline text-sm font-medium flex items-center justify-end">
                          View <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
