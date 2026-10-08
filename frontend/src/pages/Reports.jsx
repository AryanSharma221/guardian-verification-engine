import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, AlertTriangle, History } from 'lucide-react';
import ScoreDisplay from '../components/common/ScoreDisplay';
import { api } from '../api/client';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';

export default function Reports() {
  const appId = localStorage.getItem('guardian_current_app_id') || 1;
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    try {
      const res = await api.get(`/applications/${appId}/reports`);
      setReports(res.data || []);
      if (res.data?.length > 0) {
        fetchReport(res.data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchReport = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/applications/${appId}/reports/${id}`);
      setSelectedReport(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [appId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post(`/applications/${appId}/reports/generate`);
      setSelectedReport(res.data);
      fetchReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    // Deep clone and sanitize
    const sanitizedReport = JSON.parse(JSON.stringify(selectedReport));
    
    // Remove raw evidence to prevent secret leakage
    if (sanitizedReport.all_findings) {
      sanitizedReport.all_findings.forEach(f => delete f.evidence);
    }
    if (sanitizedReport.critical_findings) {
      sanitizedReport.critical_findings.forEach(f => delete f.evidence);
    }
    if (sanitizedReport.resolved_findings) {
      sanitizedReport.resolved_findings.forEach(f => delete f.evidence);
    }
    if (sanitizedReport.retests) {
      sanitizedReport.retests.forEach(r => {
        delete r.before_evidence;
        delete r.after_evidence;
      });
    }

    const blob = new Blob([JSON.stringify(sanitizedReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guardian-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !selectedReport) return <LoadingSkeleton count={3} />;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold mb-2">Readiness Report</h1>
          <p className="text-text-secondary">Comprehensive analysis of application readiness.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleGenerate} disabled={generating} className="btn-secondary flex items-center">
            {generating ? 'Generating...' : 'Generate New Report'}
          </button>
          {selectedReport && (
            <button onClick={handleExport} className="btn-primary flex items-center">
              <Download className="w-4 h-4 mr-2" /> Export JSON
            </button>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {reports.length > 1 && (
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          <History className="w-5 h-5 text-text-muted flex-shrink-0" />
          {reports.map(r => (
            <button
              key={r.id}
              onClick={() => fetchReport(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap ${selectedReport?.id === r.id ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:border-primary/50'}`}
            >
              {new Date(r.created_at).toLocaleString()} ({Math.round(r.overall_score)})
            </button>
          ))}
        </div>
      )}

      {!selectedReport && !loading && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reports Generated</h3>
          <p className="text-text-secondary mb-6">Run a test scan and generate a readiness report.</p>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary inline-flex">
            Generate Report
          </button>
        </div>
      )}

      {selectedReport && (
        <>
          <div className={`card text-center ${selectedReport.readiness_status === 'PRODUCTION_BLOCKER' || selectedReport.readiness_status === 'HIGH_RISK' ? 'bg-critical-light/20 border-critical/30' : (selectedReport.readiness_status === 'READY' ? 'bg-success-light/20 border-success/30' : 'bg-warning-light/20 border-warning/30')}`}>
            <h2 className="text-xl font-bold mb-6">Executive Summary</h2>
            <div className="flex justify-center mb-6">
              <ScoreDisplay score={selectedReport.overall_score} size="large" />
            </div>
            
            <div className={`inline-flex items-center px-4 py-2 font-bold rounded mb-4 text-white ${selectedReport.readiness_status === 'PRODUCTION_BLOCKER' || selectedReport.readiness_status === 'HIGH_RISK' ? 'bg-critical' : (selectedReport.readiness_status === 'READY' ? 'bg-success' : 'bg-warning')}`}>
              {selectedReport.readiness_status === 'READY' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
              {selectedReport.readiness_status.replace('_', ' ')}
            </div>
            <p className="text-text-secondary max-w-2xl mx-auto">
              {selectedReport.executive_summary}
              <br /><br />
              <strong>{selectedReport.readiness_decision}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Category Scores</h3>
              <ul className="space-y-4">
                {selectedReport.category_scores && Object.values(selectedReport.category_scores).map((cat, i) => (
                  <li key={i} className="flex justify-between items-center">
                    <span className="text-text-secondary">{cat.label} ({cat.weight})</span> 
                    <span className={`font-bold ${cat.score >= 80 ? 'text-success' : (cat.score >= 60 ? 'text-warning' : 'text-critical')}`}>{Math.round(cat.score)}/100</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Critical Action Items</h3>
              <ul className="space-y-3 text-sm">
                {selectedReport.recommendations && selectedReport.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-critical mr-2 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
                {(!selectedReport.recommendations || selectedReport.recommendations.length === 0) && (
                   <li className="text-text-secondary italic">No critical action items. You are ready for production.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="card">
             <h3 className="text-lg font-semibold mb-4">All Identified Findings</h3>
             {selectedReport.all_findings && selectedReport.all_findings.length > 0 ? (
               <div className="space-y-2">
                 {selectedReport.all_findings.map(f => (
                   <div key={f.id} className="flex justify-between items-center p-3 bg-surface border border-border rounded text-sm">
                     <div className="flex flex-col">
                       <span className="font-semibold">{f.title}</span>
                       <span className="text-xs text-text-secondary">{f.category} • {f.severity}</span>
                     </div>
                     <span className={`px-2 py-1 text-xs rounded font-medium ${f.status === 'resolved' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>{f.status}</span>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-text-secondary italic">No findings to report.</p>
             )}
          </div>
          
          {selectedReport.retests && selectedReport.retests.length > 0 && (
             <div className="card border-dashed">
               <h3 className="text-lg font-semibold mb-4">Validation & Retest Results</h3>
               <div className="space-y-2">
                 {selectedReport.retests.map(r => (
                   <div key={r.id} className="flex justify-between items-center p-3 bg-surface border border-border rounded text-sm">
                     <span className="font-semibold">Retest Run on {new Date(r.created_at).toLocaleString()}</span>
                     <span className={`px-2 py-1 text-xs rounded font-medium ${r.status === 'passed' ? 'bg-success-light text-success' : 'bg-critical-light text-critical'}`}>{r.status === 'passed' ? 'VERIFIED' : 'FAILED'}</span>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </>
      )}
    </div>
  );
}
