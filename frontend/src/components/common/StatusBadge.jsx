import React from 'react';

export const StatusBadge = ({ status }) => {
  const getTailwindClasses = (stat) => {
    const s = stat.toLowerCase();
    if (['active', 'operational', 'nominal', 'up'].includes(s)) {
      return 'bg-accent-green/10 border-accent-green/20 text-accent-green';
    }
    if (['planning', 'standby', 'deployed'].includes(s)) {
      return 'bg-accent-cyan/10 border-accent-cyan/20 text-accent-cyan';
    }
    if (['warning', 'maintenance'].includes(s)) {
      return 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber';
    }
    if (['failed', 'offline', 'damage', 'critical', 'down'].includes(s)) {
      return 'bg-accent-red/10 border-accent-red/20 text-accent-red';
    }
    // neutralized, completed, lost, retired
    return 'bg-white/5 border-white/10 text-white/50';
  };

  const badgeClass = getTailwindClasses(status);

  return (
    <span className={`text-[11px] font-mono font-semibold border px-2 py-0.5 rounded inline-block text-center uppercase tracking-wide ${badgeClass}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
