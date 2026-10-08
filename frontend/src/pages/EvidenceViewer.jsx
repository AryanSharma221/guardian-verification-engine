import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { ArrowLeft, PlayCircle, Download, Clock, Zap } from 'lucide-react';

export default function EvidenceViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const res = await api.get(`/findings/${id}/evidence`);
        // If it's an array of evidence, use the first one, or use the object directly
        setEvidence(Array.isArray(res.data) ? res.data[0] : res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvidence();
  }, [id]);

  if (loading) return <div className="p-8"><LoadingSkeleton count={1} type="chart" /></div>;
  if (error) return <div className="p-8"><ErrorMessage message={error} /></div>;
  if (!evidence) return <div className="p-8"><ErrorMessage message="No evidence records found for this finding." /></div>;

  const { request, response, status_code, timestamp, latency, execution_timeline } = evidence;
  const isErrorStatus = status_code >= 400;

  const redact = (str) => {
    if (!str) return str;
    let s = typeof str === 'string' ? str : JSON.stringify(str, null, 2);
    return s.replace(/(Bearer\s+)[A-Za-z0-9\-_=\.]+/gi, '$1[REDACTED]')
            .replace(/(Authorization:\s*)[^\n]+/gi, '$1[REDACTED]')
            .replace(/("password"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
            .replace(/("token"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
            .replace(/("api_key"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="text-sm text-text-secondary hover:text-primary flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Finding
        </button>
        <div className="flex space-x-2">
          <button className="btn-secondary text-sm flex items-center"><PlayCircle className="w-4 h-4 mr-2"/> Replay Request</button>
          <button className="btn-secondary text-sm flex items-center"><Download className="w-4 h-4 mr-2"/> Export</button>
        </div>
      </div>

      <div className="flex gap-4 mb-2">
        <div className="bg-surface border border-border rounded px-4 py-2 flex items-center text-sm">
          <Clock className="w-4 h-4 text-text-muted mr-2" />
          <span className="text-text-secondary mr-2">Timestamp:</span>
          <span className="font-medium">{timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}</span>
        </div>
        {latency && (
          <div className="bg-surface border border-border rounded px-4 py-2 flex items-center text-sm">
            <Zap className="w-4 h-4 text-text-muted mr-2" />
            <span className="text-text-secondary mr-2">Latency:</span>
            <span className="font-medium">{latency}ms</span>
          </div>
        )}
        {evidence.requests_sent && (
          <div className="bg-surface border border-border rounded px-4 py-2 flex items-center text-sm">
            <span className="text-text-secondary mr-2">Concurrency:</span>
            <span className="font-medium">{evidence.requests_sent} requests</span>
          </div>
        )}
      </div>

      {evidence.timeline ? (
        <div className="flex-1 card min-h-0 overflow-auto">
          <h3 className="font-semibold text-sm mb-4">Concurrency Timeline</h3>
          <div className="flex justify-between items-center mb-6 p-4 bg-background rounded border border-border">
             <div className="text-center">
               <p className="text-xs text-text-secondary uppercase">State Before</p>
               <pre className="font-mono text-sm mt-1">{JSON.stringify(evidence.initial_state)}</pre>
             </div>
             <ArrowLeft className="w-4 h-4 text-text-muted rotate-180" />
             <div className="text-center">
               <p className="text-xs text-text-secondary uppercase">State After</p>
               <pre className={`font-mono text-sm mt-1 ${evidence.final_state?.available_slots < 0 ? 'text-critical' : 'text-success'}`}>
                 {JSON.stringify(evidence.final_state)}
               </pre>
             </div>
          </div>
          <div className="space-y-2">
            {evidence.timeline.map((event, idx) => (
              <div key={idx} className="flex items-center text-sm p-2 bg-background border border-border rounded">
                <div className="w-20 font-mono text-text-muted">T+{event.t}ms</div>
                <div className="w-48 font-medium">{event.action}</div>
                <div className="flex-1 font-mono text-xs">{event.state_read ? `Read: ${event.state_read}` : `Write: ${event.new_state}`}</div>
                <div className={`w-24 text-right ${event.status === 'success' ? 'text-success' : 'text-warning'}`}>{event.status}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          <div className="card flex flex-col min-h-0 p-0 overflow-hidden">
            <div className="bg-background px-4 py-2 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-sm">Request (Attacker Context)</h3>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-[#1A1D26] text-[#E2E5EB] font-mono text-xs">
              <pre className="whitespace-pre-wrap">{redact(request) || 'No request data available.'}</pre>
            </div>
          </div>

          <div className="card flex flex-col min-h-0 p-0 overflow-hidden">
            <div className={`border-b px-4 py-2 flex justify-between items-center ${isErrorStatus ? 'bg-critical-light border-critical/20' : 'bg-success-light border-success/20'}`}>
              <h3 className={`font-semibold text-sm ${isErrorStatus ? 'text-critical' : 'text-success'}`}>Response</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isErrorStatus ? 'text-critical bg-white border-critical/20' : 'text-success bg-white border-success/20'}`}>
                {status_code || 'Unknown'}
              </span>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-[#1A1D26] text-[#E2E5EB] font-mono text-xs">
              <pre className="whitespace-pre-wrap">{redact(response) || 'No response data available.'}</pre>
            </div>
          </div>
        </div>
      )}
      
      {execution_timeline && execution_timeline.length > 0 && (
         <div className="card p-4 h-48 overflow-y-auto">
            <h3 className="font-semibold text-sm mb-3">Execution Timeline</h3>
            <ul className="space-y-2 text-sm">
               {execution_timeline.map((event, i) => (
                  <li key={i} className="flex">
                    <span className="w-20 text-text-muted font-mono">{event.time || `T+${i*10}ms`}</span>
                    <span>{event.event || event}</span>
                  </li>
               ))}
            </ul>
         </div>
      )}
    </div>
  );
}
