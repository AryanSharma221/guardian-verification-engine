import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScoreDisplay from '../components/common/ScoreDisplay';
import { ShieldAlert, Key, Unlock, FileText, Activity, Lock, ArrowRight } from 'lucide-react';

export default function SecurityCenter() {
  const navigate = useNavigate();
  // Mock data for display
  const [data] = useState({
    score: 65,
    stats: { run: 142, passed: 120, warnings: 15, high: 5, critical: 2 },
    categories: [
      { id: 'authn', name: 'Authentication', icon: Key, tests: 24, passed: 24, issues: 0 },
      { id: 'authz', name: 'Authorization', icon: Unlock, tests: 45, passed: 42, issues: 3, critical: 1 },
      { id: 'bola', name: 'Object Access (BOLA)', icon: FileText, tests: 30, passed: 25, issues: 5, critical: 1 },
      { id: 'data', name: 'Sensitive Data', icon: Lock, tests: 18, passed: 16, issues: 2 },
      { id: 'rate', name: 'Rate Limiting', icon: Activity, tests: 12, passed: 8, issues: 4 },
      { id: 'session', name: 'Session Security', icon: ShieldAlert, tests: 13, passed: 13, issues: 0 }
    ]
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold">Security Center</h1>
          <p className="text-text-secondary">Comprehensive view of application security posture.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card lg:col-span-1 flex flex-col items-center justify-center text-center p-6">
           <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Security Score</h3>
           <ScoreDisplay score={data.score} size="large" />
        </div>
        <div className="card lg:col-span-3">
           <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Test Statistics</h3>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatBox label="Total Run" value={data.stats.run} />
              <StatBox label="Passed" value={data.stats.passed} color="text-success" />
              <StatBox label="Warnings" value={data.stats.warnings} color="text-warning" />
              <StatBox label="High Risk" value={data.stats.high} color="text-warning" />
              <StatBox label="Critical" value={data.stats.critical} color="text-critical" />
           </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-4">Security Categories</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.categories.map(cat => {
          const Icon = cat.icon;
          const hasIssues = cat.issues > 0;
          return (
            <div key={cat.id} className="card hover:border-primary/50 cursor-pointer transition-colors" onClick={() => navigate(`/security/authorization/${cat.id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${hasIssues ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold">{cat.name}</h4>
                </div>
                {cat.critical > 0 && <span className="bg-critical text-white text-xs px-2 py-0.5 rounded-full font-medium">{cat.critical} Crit</span>}
              </div>
              <div className="flex justify-between items-end text-sm">
                <div className="text-text-secondary">
                  <span className="font-medium text-text-primary">{cat.tests}</span> tests run
                </div>
                {hasIssues ? (
                  <span className="text-warning font-medium flex items-center">
                    {cat.issues} issues <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                ) : (
                  <span className="text-success font-medium flex items-center">
                    All clear <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value, color = "text-text-primary" }) {
  return (
    <div className="bg-background p-4 rounded-lg border border-border text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}
