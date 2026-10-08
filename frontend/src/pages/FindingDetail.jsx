import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import SeverityBadge from '../components/common/SeverityBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { ArrowLeft, Code, FileSearch, Wrench, ShieldAlert, PlayCircle } from 'lucide-react';

export default function FindingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [finding, setFinding] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState(null);
  const [diagnosisError, setDiagnosisError] = useState(null);

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

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setDiagnosisError(null);
    try {
      const res = await api.post(`/findings/${id}/diagnose`);
      setDiagnosis(res.data);
    } catch (err) {
      setDiagnosisError('Analysis incomplete. ' + err.message);
    } finally {
      setDiagnosing(false);
    }
  };

  if (loading) return <LoadingSkeleton count={3} />;
  if (error) return <ErrorMessage message={error} />;
  if (!finding) return <ErrorMessage message="Finding not found." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-text-secondary hover:text-primary flex items-center mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Findings
      </button>

      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <SeverityBadge severity={finding.severity} />
              <span className="text-sm font-medium text-text-muted">{finding.category} • {finding.status}</span>
            </div>
            <h1 className="text-2xl font-bold">{finding.title}</h1>
          </div>
          <div className="flex space-x-2">
             <button onClick={() => navigate(`/findings/${id}/remediation`)} className="btn-primary flex items-center"><Wrench className="w-4 h-4 mr-2"/> Fix</button>
             <button onClick={() => navigate(`/findings/${id}/evidence`)} className="btn-secondary flex items-center"><Code className="w-4 h-4 mr-2"/> Evidence</button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-text-primary text-sm font-semibold uppercase tracking-wider mb-1">Description</h3>
              <p className="text-text-secondary text-sm">{finding.description}</p>
            </div>
          </div>
          
          <div className="md:w-64 bg-background border border-border rounded-lg p-4 space-y-3 text-sm">
            <div>
              <span className="text-text-muted text-xs uppercase block mb-1">Component</span>
              <span className="font-medium text-text-primary">{finding.component || '-'}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs uppercase block mb-1">Workflow</span>
              <span className="font-medium text-text-primary">{finding.workflow || '-'}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs uppercase block mb-1">Confidence</span>
              <span className="font-medium text-text-primary capitalize">{finding.confidence || 'Observed'}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs uppercase block mb-1">Discovered At</span>
              <span className="font-medium text-text-secondary">{new Date(finding.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {!diagnosis ? (
          <div className="bg-info-light/30 border border-info/20 rounded-lg p-6 flex flex-col items-center justify-center text-center">
            <FileSearch className="w-8 h-8 text-info mb-3" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">AI Diagnosis</h3>
            <p className="text-sm text-text-secondary mb-4 max-w-lg">Get an AI-powered deep dive into what happened, root cause analysis, and tailored recommendations.</p>
            {diagnosisError && (
              <div className="bg-critical-light text-critical text-sm p-3 rounded mb-4 max-w-lg text-left border border-critical">
                {diagnosisError}
              </div>
            )}
            <button onClick={handleDiagnose} disabled={diagnosing} className="btn-primary flex items-center bg-info hover:bg-info/90">
              {diagnosing ? 'Analyzing...' : 'Diagnose Issue'}
            </button>
          </div>
        ) : (
          <div className="bg-info-light/30 border border-info/20 rounded-lg p-6 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-lg font-semibold text-info flex items-center mb-4"><FileSearch className="w-5 h-5 mr-2"/> AI Diagnosis Results</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-1">What Happened?</h4>
                <p className="text-sm text-text-secondary">{diagnosis.what_happened}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-1">Likely Root Cause</h4>
                    <p className="text-sm text-text-secondary">{diagnosis.root_cause}</p>
                 </div>
                 <div>
                    <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-1">Impact</h4>
                    <p className="text-sm text-critical font-medium flex items-center"><ShieldAlert className="w-4 h-4 mr-1"/> {diagnosis.impact}</p>
                 </div>
              </div>
              <div className="bg-surface border border-border rounded p-4">
                <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-2">Recommendation</h4>
                <p className="text-sm text-text-secondary mb-3">{diagnosis.recommendation}</p>
                {diagnosis.evidence_summary && (
                  <pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto text-text-secondary">
                    {diagnosis.evidence_summary}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
