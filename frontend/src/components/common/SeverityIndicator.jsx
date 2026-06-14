import React from 'react';

export const SeverityIndicator = ({ severity }) => {
  const getTailwindClasses = (sev) => {
    const s = sev.toLowerCase();
    switch (s) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/20 text-red-500 blink-critical';
      case 'high':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      case 'medium':
        return 'bg-sky-500/10 border-sky-500/20 text-sky-500';
      default: // low
        return 'bg-zinc-800/50 border-zinc-800 text-zinc-400';
    }
  };

  const indicatorClass = getTailwindClasses(severity);

  return (
    <span className={`text-[10px] font-mono font-bold border px-2 py-0.5 rounded-md inline-block text-center uppercase tracking-wide ${indicatorClass}`}>
      {severity}
    </span>
  );
};

export default SeverityIndicator;
