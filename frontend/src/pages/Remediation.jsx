import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { ArrowLeft, Check, X, Wrench, RotateCcw, Zap } from 'lucide-react';

export default function Remediation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [remediation, setRemediation] = useState(null);
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [remRes, findRes] = await Promise.all([
          api.get(`/findings/${id}/remediation`).catch(() => ({ data: null })),
          api.get(`/findings/${id}`)
        ]);
        setRemediation(remRes.data);
        setFinding(findRes.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/findings/${id}/remediation`);
      setRemediation(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAction = async (decision) => {
    if (!remediation?.id) return;
    setActioning(true);
    try {
      await api.patch(`/remediations/${remediation.id}`, { decision });
      setRemediation({ ...remediation, status: decision });
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedRecommendation, setEditedRecommendation] = useState('');

  if (loading) return <LoadingSkeleton count={2} />;
  if (error && !finding) return <ErrorMessage message={error} />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate(-1)} className="text-sm text-text-secondary hover:text-primary flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Finding
        </button>
      </div>

      <h1 className="text-2xl font-bold">Remediation Center</h1>
      
      {error && <ErrorMessage message={error} />}

      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Problem Description</h3>
        <p className="text-sm text-text-secondary mb-6">{finding?.description || 'Finding information not available.'}</p>

        {!remediation ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-background rounded-lg border border-dashed border-border">
            <Zap className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Remediation Found</h3>
            <p className="text-sm text-text-secondary mb-4">Generate an AI-powered remediation plan and code patch for this finding.</p>
            <button onClick={handleGenerate} disabled={generating} className="btn-primary">
              {generating ? 'Generating Fix...' : 'Generate Fix'}
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-2">Proposed Fix</h3>
            <div className="flex items-center space-x-2 mb-3">
              <span className="inline-block text-xs font-semibold bg-success-light text-success px-2 py-1 rounded border border-success/20">PROPOSED FIX</span>
              {remediation.status && (
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded border ${remediation.status === 'approved' ? 'bg-success-light text-success border-success/20' : 'bg-critical-light text-critical border-critical/20'}`}>
                  {remediation.status.toUpperCase()}
                </span>
              )}
            </div>
            
            {isEditing ? (
              <div className="mb-4">
                <textarea 
                  className="input-field w-full h-32" 
                  value={editedRecommendation} 
                  onChange={(e) => setEditedRecommendation(e.target.value)}
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button onClick={() => setIsEditing(false)} className="btn-secondary text-xs">Cancel</button>
                  <button onClick={async () => {
                     try {
                       await api.patch(`/remediations/${remediation.id}`, { recommendation: editedRecommendation });
                       setRemediation({ ...remediation, recommendation: editedRecommendation });
                       setIsEditing(false);
                     } catch(err) { setError(err.message); }
                  }} className="btn-primary text-xs">Save</button>
                </div>
              </div>
            ) : (
              remediation.recommendation && (
                <p className="text-sm text-text-secondary mb-4">{remediation.recommendation}</p>
              )
            )}

            {remediation.patch && (
              <div className="bg-[#1A1D26] text-[#E2E5EB] font-mono text-sm p-4 rounded-md mb-6 overflow-x-auto">
                <pre>{remediation.patch}</pre>
              </div>
            )}

            <h3 className="text-lg font-semibold mb-2">Expected Result</h3>
            <p className="text-sm text-text-secondary mb-6">{remediation.expected_result || 'The vulnerability will be mitigated.'}</p>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <button onClick={() => handleAction('rejected')} disabled={actioning} className="btn-secondary flex items-center text-critical hover:bg-critical-light hover:border-critical/30"><X className="w-4 h-4 mr-2"/> Reject</button>
              <button onClick={() => { setEditedRecommendation(remediation.recommendation || ''); setIsEditing(true); }} className="btn-secondary flex items-center"><Wrench className="w-4 h-4 mr-2"/> Modify</button>
              <button onClick={() => handleAction('approved')} disabled={actioning} className="btn-primary flex items-center bg-info hover:bg-info/90"><Check className="w-4 h-4 mr-2"/> Apply Fix</button>
              <button onClick={() => navigate(`/findings/${id}/retest`)} className="btn-primary flex items-center"><RotateCcw className="w-4 h-4 mr-2"/> Retest</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
