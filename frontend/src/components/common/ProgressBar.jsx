import React from 'react';

export default function ProgressBar({ progress, color = 'bg-primary' }) {
  const p = Math.min(Math.max(progress, 0), 100);
  return (
    <div className="w-full bg-border rounded-full h-2 overflow-hidden">
      <div 
        className={`${color} h-2 rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${p}%` }}
      ></div>
    </div>
  );
}
