import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle, ShieldAlert } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

export default function Retest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [finding, setFinding] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinding = async () => {
      try {
        const res = await api.get(`/findings/${id}`);
        setFinding(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFinding();
  }, [id]);

  const runTest = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.post(`/findings/${id}/retest`);
      setResult(res.data);
      setFinding(prev => ({...prev, status: 'resolved'}));
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <LoadingSkeleton count={3} />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => navigate(-1)} className="text-sm text-text-secondary hover:text-primary flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Finding
        </button>
      </div>

      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Retest Vulnerability</h1>
          <p className="text-text-secondary">Verify if the applied remediation successfully resolved the issue.</p>
        </div>
        <button onClick={runTest} disabled={running || result} className="btn-primary flex items-center px-6">
          {running ? 'Testing...' : <><RotateCcw className="w-4 h-4 mr-2"/> Run Retest</>}
        </button>
      </div>
      
      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BEFORE */}
        <div className="card bg-background border-dashed">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex justify-between">
            Before <span className="bg-critical-light text-critical px-2 py-0.5 rounded text-xs">VULNERABLE</span>
          </h3>
          <div className="bg-surface p-4 rounded border border-border mb-4 font-mono text-xs overflow-x-auto text-text-secondary">
            <pre>
{finding?.evidence ? JSON.stringify(typeof finding.evidence === 'string' ? JSON.parse(finding.evidence) : finding.evidence, null, 2) : 'No before evidence'}
            </pre>
          </div>
        </div>

        {/* AFTER */}
        <div className={`card ${result ? 'border-success bg-success-light/10' : ''}`}>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex justify-between">
            After {result && <span className="bg-success-light text-success px-2 py-0.5 rounded text-xs flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> MITIGATED</span>}
          </h3>
          
          {!running && !result && (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-text-muted">
              <RotateCcw className="w-8 h-8 mb-2 opacity-50" />
              <p>Run retest to capture new evidence</p>
            </div>
          )}

          {running && (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-primary">
              <RotateCcw className="w-8 h-8 mb-2 animate-spin" />
              <p>Executing test...</p>
            </div>
          )}

          {result && (
            <div className="bg-surface p-4 rounded border border-border mb-4 font-mono text-xs overflow-x-auto text-text-secondary">
              <pre>
{result.after_evidence ? JSON.stringify(typeof result.after_evidence === 'string' ? JSON.parse(result.after_evidence) : result.after_evidence, null, 2) : 'No after evidence'}
              </pre>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className={`card flex items-center justify-between ${result.status === 'passed' ? 'border-success' : 'border-critical'}`}>
          <div className="flex items-center">
            {result.status === 'passed' ? (
              <CheckCircle className="w-10 h-10 text-success mr-4" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-critical mr-4" />
            )}
            <div>
              <h2 className={`text-xl font-bold ${result.status === 'passed' ? 'text-success' : 'text-critical'}`}>
                {result.status === 'passed' ? 'Retest Passed' : 'Retest Failed'}
              </h2>
              <p className="text-text-secondary text-sm">
                {result.status === 'passed' ? 'The vulnerability has been successfully remediated.' : 'The vulnerability is still present.'}
              </p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Score Impact</p>
             <div className="flex items-center text-lg font-bold">
               <span className="text-text-secondary">{Math.round(result.score_before)}</span>
               <ArrowRight className="w-5 h-5 mx-2 text-text-muted" />
               <span className={result.score_after > result.score_before ? 'text-success' : (result.score_after < result.score_before ? 'text-critical' : 'text-text-primary')}>
                 {Math.round(result.score_after)}
               </span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
