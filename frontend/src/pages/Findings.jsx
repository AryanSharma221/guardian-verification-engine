import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import SeverityBadge from '../components/common/SeverityBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import { Search, Filter, ArrowRight, AlertTriangle } from 'lucide-react';

export default function Findings() {
  const navigate = useNavigate();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({ severity: '', category: '', status: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const appId = localStorage.getItem('guardian_current_app_id') || 1;

  useEffect(() => {
    const fetchFindings = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filters.severity) queryParams.append('severity', filters.severity);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.status) queryParams.append('status', filters.status);
        
        const res = await api.get(`/applications/${appId}/findings?${queryParams.toString()}`);
        setFindings(res.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFindings();
  }, [filters, appId]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredFindings = findings.filter(f => {
    const searchTarget = (f.title + ' ' + f.component + ' ' + f.workflow + ' ' + f.description).toLowerCase();
    return searchTarget.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Findings</h1>
        <p className="text-text-secondary">All discovered vulnerabilities and performance issues.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search by title, endpoint, workflow, description..." 
            className="input-field pl-9 w-full" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select name="severity" value={filters.severity} onChange={handleFilterChange} className="input-field w-full md:w-40">
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        
        <select name="category" value={filters.category} onChange={handleFilterChange} className="input-field w-full md:w-40">
          <option value="">All Categories</option>
          <option value="Security">Security</option>
          <option value="Scalability">Scalability</option>
          <option value="Concurrency">Concurrency</option>
          <option value="Reliability">Reliability</option>
          <option value="Business Logic">Business Logic</option>
          <option value="Data Integrity">Data Integrity</option>
        </select>
        
        <select name="status" value={filters.status} onChange={handleFilterChange} className="input-field w-full md:w-40">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="pending verification">Pending Verification</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <LoadingSkeleton count={5} type="list" />
      ) : filteredFindings.length === 0 ? (
        <EmptyState title="No findings found" description="Try adjusting your filters or search query." icon={AlertTriangle} />
      ) : (
        <div className="space-y-3">
          {filteredFindings.map(finding => (
            <div key={finding.id} className="card p-4 hover:border-primary/50 cursor-pointer transition-colors" onClick={() => navigate(`/findings/${finding.id}`)}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <SeverityBadge severity={finding.severity} />
                  <div>
                    <h3 className="font-semibold text-text-primary">{finding.title}</h3>
                    <p className="text-xs text-text-secondary mt-1">ID: {finding.id} • Category: {finding.category} {finding.component && `• Component: ${finding.component}`}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${finding.status === 'Resolved' || finding.status === 'resolved' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>
                    {finding.status || 'Open'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
