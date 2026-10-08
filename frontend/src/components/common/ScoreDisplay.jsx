import React from 'react';

export default function ScoreDisplay({ score, size = 'large' }) {
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-success';
    if (s >= 60) return 'text-warning';
    return 'text-critical';
  };

  const getScoreBg = (s) => {
    if (s >= 80) return 'border-success';
    if (s >= 60) return 'border-warning';
    return 'border-critical';
  };

  const dimensions = size === 'large' ? 'w-32 h-32' : 'w-16 h-16';
  const textClass = size === 'large' ? 'text-4xl font-bold' : 'text-xl font-bold';

  return (
    <div className={`relative flex items-center justify-center rounded-full border-4 ${getScoreBg(score)} ${dimensions} bg-surface`}>
      <div className="flex flex-col items-center">
        <span className={`${textClass} ${getScoreColor(score)}`}>{score}</span>
        {size === 'large' && <span className="text-xs text-text-muted mt-1">/100</span>}
      </div>
    </div>
  );
}
