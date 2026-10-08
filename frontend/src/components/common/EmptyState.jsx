import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function EmptyState({ title, description, actionText, onAction, icon: Icon = LayoutDashboard }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-border rounded-lg border-dashed">
      <div className="bg-background p-4 rounded-full mb-4">
        <Icon className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionText}
        </button>
      )}
    </div>
  );
}
