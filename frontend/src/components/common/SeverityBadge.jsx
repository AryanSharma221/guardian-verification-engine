import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export default function SeverityBadge({ severity }) {
  const config = {
    CRITICAL: { bg: 'bg-critical-light', text: 'text-critical', icon: ShieldAlert, border: 'border-critical/20' },
    HIGH: { bg: 'bg-warning-light', text: 'text-warning', icon: AlertTriangle, border: 'border-warning/20' },
    MEDIUM: { bg: 'bg-warning-light', text: 'text-warning', icon: AlertCircle, border: 'border-warning/20' }, // Reusing warning colors for medium, could differentiate
    LOW: { bg: 'bg-info-light', text: 'text-info', icon: Info, border: 'border-info/20' },
  };

  const s = severity?.toUpperCase() || 'LOW';
  const c = config[s] || config.LOW;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="w-3 h-3 mr-1" />
      {s}
    </span>
  );
}
