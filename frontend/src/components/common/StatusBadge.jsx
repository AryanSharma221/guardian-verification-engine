import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

export default function StatusBadge({ status }) {
  const config = {
    READY: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle },
    PASSED: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle },
    NEEDS_ATTENTION: { bg: 'bg-warning-light', text: 'text-warning', icon: AlertTriangle },
    WARNING: { bg: 'bg-warning-light', text: 'text-warning', icon: AlertTriangle },
    HIGH_RISK: { bg: 'bg-critical-light', text: 'text-critical', icon: XCircle },
    FAILED: { bg: 'bg-critical-light', text: 'text-critical', icon: XCircle },
    PRODUCTION_BLOCKER: { bg: 'bg-critical-light', text: 'text-critical', icon: XCircle },
    RUNNING: { bg: 'bg-info-light', text: 'text-info', icon: Clock },
    PENDING: { bg: 'bg-background', text: 'text-text-secondary', icon: Clock },
  };

  const s = status?.toUpperCase() || 'PENDING';
  const c = config[s] || config.PENDING;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${c.bg} ${c.text}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {s.replace('_', ' ')}
    </span>
  );
}
