import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SeverityBadge from '../components/common/SeverityBadge';
import { ArrowLeft, ShieldAlert, Code, CheckCircle, XCircle } from 'lucide-react';

export default function AuthorizationTest() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-text-secondary hover:text-primary flex items-center mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Security Center
      </button>

      <div className="card border-critical/30">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <SeverityBadge severity="CRITICAL" />
              <span className="text-sm font-medium text-text-muted">Object Access (BOLA)</span>
            </div>
            <h1 className="text-2xl font-bold">Broken Object-Level Authorization</h1>
          </div>
          <button className="btn-primary">Generate Fix</button>
        </div>

        <div className="bg-background border border-border rounded-md p-3 font-mono text-sm mb-6 flex items-center">
          <span className="font-bold text-info mr-3">GET</span>
          <span>/api/patients/:id</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Scenario</h3>
            <p className="text-sm">A user with the "Patient" role attempts to access a patient record belonging to a different user by modifying the `:id` parameter in the URL.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Impact</h3>
            <p className="text-sm text-critical font-medium">Data Leakage. Any authenticated user can access any patient's PII and medical records.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-success-light border border-success/20 rounded-md p-4">
            <h4 className="text-sm font-semibold text-success flex items-center mb-2"><CheckCircle className="w-4 h-4 mr-1" /> Expected Result</h4>
            <p className="text-sm">Server should validate ownership and return 403 Forbidden or 404 Not Found.</p>
          </div>
          <div className="bg-critical-light border border-critical/20 rounded-md p-4">
            <h4 className="text-sm font-semibold text-critical flex items-center mb-2"><XCircle className="w-4 h-4 mr-1" /> Observed Result</h4>
            <p className="text-sm">Server returned 200 OK with the requested patient's full data payload.</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button onClick={() => navigate(`/findings/bola-1/evidence`)} className="btn-secondary flex items-center">
            <Code className="w-4 h-4 mr-2" /> View Technical Evidence
          </button>
          <button className="btn-secondary">Retest</button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Permission Matrix</h3>
        <p className="text-sm text-text-secondary mb-4">Observed access patterns during testing.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-background text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-md">Resource</th>
                <th className="px-4 py-3 font-medium">Admin Role</th>
                <th className="px-4 py-3 font-medium">Doctor Role</th>
                <th className="px-4 py-3 font-medium rounded-tr-md">Patient Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium">Own Profile</td>
                <td className="px-4 py-3 text-success">Allowed</td>
                <td className="px-4 py-3 text-success">Allowed</td>
                <td className="px-4 py-3 text-success">Allowed</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Other Patient Profile</td>
                <td className="px-4 py-3 text-success">Allowed</td>
                <td className="px-4 py-3 text-success">Allowed (Assigned)</td>
                <td className="px-4 py-3 text-critical font-bold bg-critical-light/30">Allowed (VULNERABLE)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
