import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import SeverityBadge from '../components/common/SeverityBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import { ArrowRight, FileText, Briefcase } from 'lucide-react';

export default function BusinessLogic() {
  const navigate = useNavigate();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hardcode app ID to 1 for now if no context exists, standard for this dashboard
  const appId = 1;

  useEffect(() => {
    const fetchFindings = async () => {
      try {
        const res = await api.get(`/applications/${appId}/findings?category=Business Logic`);
        setFindings(res.data || []);
      } catch (err) {
        // Fallback to fetch all and filter if specific query params fail
        try {
          const res = await api.get(`/applications/${appId}/findings`);
          const filtered = (res.data || []).filter(f => f.category === 'Business Logic' || f.category === 'Business_Logic');
          setFindings(filtered);
        } catch (innerErr) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFindings();
  }, [appId]);

  if (loading) return <LoadingSkeleton count={4} type="card" />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Business Logic Tests</h1>
        <p className="text-text-secondary">Tests verifying state machine integrity and complex business rules.</p>
      </div>

      {findings.length === 0 ? (
        <EmptyState 
          title="No Business Logic Findings" 
          description="Your application passed all business logic tests or no tests have been run yet."
          icon={Briefcase}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {findings.map(finding => (
            <div key={finding.id} onClick={() => navigate(`/findings/${finding.id}`)} className="card hover:shadow-md transition-shadow cursor-pointer border-l-4" style={{borderLeftColor: finding.severity === 'CRITICAL' ? '#DC2626' : finding.severity === 'HIGH' ? '#D97706' : '#334EEC'}}>
              <div className="flex justify-between items-start mb-3">
                <SeverityBadge severity={finding.severity} />
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  finding.status === 'Resolved' || finding.status === 'resolved' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                }`}>{finding.status || 'Open'}</span>
              </div>
              <h3 className="font-semibold text-lg mb-1 line-clamp-2" title={finding.title}>{finding.title}</h3>
              <p className="text-sm text-text-secondary mb-4 flex items-center">
                 <FileText className="w-3 h-3 mr-1" /> Workflow / Component: {finding.component || 'Unknown'}
              </p>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-xs text-text-muted">{finding.created_at ? new Date(finding.created_at).toLocaleDateString() : 'Recent'}</span>
                <button className="text-sm text-primary font-medium hover:underline flex items-center">
                  Details <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
