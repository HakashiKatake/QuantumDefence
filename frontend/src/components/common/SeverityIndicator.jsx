import React from 'react';

export const SeverityIndicator = ({ severity }) => {
  const getTailwindClasses = (sev) => {
    const s = sev.toLowerCase();
    switch (s) {
      case 'critical':
        return 'bg-accent-red/15 border-accent-red text-accent-red blink-critical';
      case 'high':
        return 'bg-accent-amber/15 border-accent-amber text-accent-amber';
      case 'medium':
        return 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan';
      default: // low
        return 'bg-white/10 border-white/20 text-white/60';
    }
  };

  const indicatorClass = getTailwindClasses(severity);

  return (
    <span className={`text-[11px] font-mono font-bold border px-2 py-0.5 rounded-xs inline-block text-center uppercase tracking-wide ${indicatorClass}`}>
      {severity}
    </span>
  );
};

export default SeverityIndicator;
