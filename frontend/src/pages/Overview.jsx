import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import ScoreDisplay from '../components/common/ScoreDisplay';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import ProgressBar from '../components/common/ProgressBar';
import { AlertTriangle, Play, ArrowRight, ShieldAlert, Activity, Users, Briefcase, Database } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function Overview() {
  const { id } = useParams();
  const appId = id || 1;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    const fetchData = async () => {
      try {
        const appRes = await api.get(`/applications`);
        const app = appRes.data?.find(a => a.id == appId) || appRes.data?.[0];
        
        if (!app) {
           setLoading(false);
           return;
        }

        const scoreRes = await api.get(`/applications/${app.id}/score`);
        setData({ application: app, ...scoreRes.data });
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [appId]);

  if (loading) return <LoadingSkeleton count={3} />;
  if (error) return <ErrorMessage message={error} />;
  if (!data?.application || !data?.score) {
    return (
      <EmptyState 
        title="No tests have been run yet."
        description="Run your first Guardian scan to discover security, scalability and reliability issues."
        actionText="Start First Scan"
        onAction={() => navigate('/applications/new')}
      />
    );
  }

  const { score, status, categories, criticalFindings, recentRuns, latestDegradation } = data;

  const getCategoryIcon = (name) => {
    switch (name) {
      case 'Security': return <ShieldAlert className="w-4 h-4 mr-2 text-text-muted" />;
      case 'Scalability': return <Activity className="w-4 h-4 mr-2 text-text-muted" />;
      case 'Reliability': return <Activity className="w-4 h-4 mr-2 text-text-muted" />;
      case 'Business Logic': return <Briefcase className="w-4 h-4 mr-2 text-text-muted" />;
      case 'Data Integrity': return <Database className="w-4 h-4 mr-2 text-text-muted" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{data.application.name}</h1>
          <p className="text-text-secondary mt-1">{data.application.description || 'Production Readiness Overview'}</p>
        </div>
        <button onClick={() => navigate(`/applications/${data.application.id}/discovery`)} className="btn-primary flex items-center">
          <Play className="w-4 h-4 mr-2" />
          Run Scan
        </button>
      </div>

      {status === 'PRODUCTION_BLOCKER' && (
        <div className="bg-critical-light border border-critical/30 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-critical mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-critical">PRODUCTION BLOCKER</h3>
            <p className="text-sm text-critical/80 mt-1">Critical vulnerabilities or scalability limits detected. This application is not safe for production.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1 flex flex-col items-center justify-center text-center p-8">
          <ScoreDisplay score={score} size="large" />
          <div className="mt-6">
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-text-secondary mt-4 max-w-xs">
            Overall readiness score based on latest test results across all categories.
          </p>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6">Category Breakdown</h3>
          <div className="space-y-5">
            {categories?.map((cat, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    {getCategoryIcon(cat.name)}
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-xs text-text-muted ml-2">({cat.weight}% weight)</span>
                  </div>
                  <span className="text-sm font-semibold">{cat.score}/100</span>
                </div>
                <ProgressBar progress={cat.score} color={cat.score < 60 ? 'bg-critical' : cat.score < 80 ? 'bg-warning' : 'bg-success'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Critical Findings <span className="ml-2 bg-critical-light text-critical text-xs py-0.5 px-2 rounded-full">{criticalFindings?.length || 0}</span></h3>
            <button onClick={() => navigate('/findings')} className="text-sm text-primary hover:underline flex items-center">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
          {criticalFindings?.length > 0 ? (
            <ul className="space-y-3">
              {criticalFindings.map((finding, i) => (
                <li key={i} className="flex items-start p-3 bg-background rounded-md border border-border">
                  <ShieldAlert className="w-4 h-4 text-critical mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{finding.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{finding.category} • {finding.component}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6 text-text-secondary text-sm">No critical findings.</div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold">Recent Test Runs</h3>
             <button onClick={() => navigate('/test-runs')} className="text-sm text-primary hover:underline flex items-center">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
          {recentRuns?.length > 0 ? (
            <div className="space-y-3">
              {recentRuns.map((run, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-background rounded-md border border-border">
                  <div>
                    <p className="text-sm font-medium">{new Date(run.date).toLocaleDateString()} - {run.profile}</p>
                    <p className="text-xs text-text-secondary mt-1">{run.testsRun} tests</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold">{run.score}/100</span>
                    <StatusBadge status={run.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-6 text-text-secondary text-sm">No recent test runs.</div>
          )}
        </div>
      </div>
    </div>
  );
}
