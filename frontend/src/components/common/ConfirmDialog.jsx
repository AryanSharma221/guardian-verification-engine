import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, type = 'warning' }) {
  if (!isOpen) return null;

  const btnClass = type === 'danger' ? 'bg-critical hover:bg-critical/90 text-white' : 'btn-primary';
  const iconClass = type === 'danger' ? 'text-critical bg-critical-light' : 'text-warning bg-warning-light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/50 backdrop-blur-sm">
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-lg font-medium text-text-primary flex items-center">
            <div className={`p-1.5 rounded-full mr-2 ${iconClass}`}>
               <AlertTriangle className="w-5 h-5" />
            </div>
            {title}
          </h3>
          <button onClick={onCancel} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-secondary">{message}</p>
        </div>
        <div className="bg-background px-4 py-3 flex justify-end space-x-3 border-t border-border">
          <button onClick={onCancel} className="btn-secondary">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-md font-medium transition-colors ${btnClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
