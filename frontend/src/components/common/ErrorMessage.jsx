import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className="bg-critical-light border border-critical/20 rounded-md p-4 flex items-start">
      <AlertCircle className="w-5 h-5 text-critical mt-0.5 mr-3 flex-shrink-0" />
      <div>
        <h4 className="text-sm font-medium text-critical">Error</h4>
        <p className="text-sm text-critical/80 mt-1">{message}</p>
      </div>
    </div>
  );
}
