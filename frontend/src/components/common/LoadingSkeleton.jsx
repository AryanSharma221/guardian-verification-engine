import React from 'react';

export default function LoadingSkeleton({ type = 'card', count = 1 }) {
  const renderSkeleton = (i) => {
    switch (type) {
      case 'card':
        return (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-border rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-border rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-border rounded w-5/6"></div>
          </div>
        );
      case 'list':
        return (
          <div key={i} className="flex items-center space-x-4 animate-pulse p-4 border-b border-border">
            <div className="rounded-full bg-border h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-border rounded w-1/4"></div>
              <div className="h-4 bg-border rounded w-1/2"></div>
            </div>
          </div>
        );
      case 'chart':
        return (
          <div key={i} className="card animate-pulse h-64 flex items-end space-x-2 p-6">
            {[...Array(12)].map((_, j) => (
              <div key={j} className="bg-border w-full rounded-t" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
            ))}
          </div>
        );
      default:
        return (
          <div key={i} className="h-4 bg-border rounded w-full animate-pulse my-2"></div>
        );
    }
  };

  return (
    <div className={`space-y-4 ${type === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0' : ''}`}>
      {[...Array(count)].map((_, i) => renderSkeleton(i))}
    </div>
  );
}
