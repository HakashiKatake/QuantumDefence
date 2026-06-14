import React from 'react';

export const StatusBadge = ({ status }) => {
  const getTailwindClasses = (stat) => {
    const s = stat.toLowerCase();
    if (['active', 'operational', 'nominal', 'up'].includes(s)) {
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
    }
    if (['planning', 'standby', 'deployed'].includes(s)) {
      return 'bg-sky-500/10 border-sky-500/20 text-sky-500';
    }
    if (['warning', 'maintenance'].includes(s)) {
      return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
    }
    if (['failed', 'offline', 'damage', 'critical', 'down'].includes(s)) {
      return 'bg-red-500/10 border-red-500/20 text-red-500';
    }
    // neutralized, completed, lost, retired
    return 'bg-zinc-800 border-zinc-700 text-zinc-400';
  };

  const badgeClass = getTailwindClasses(status);

  return (
    <span className={`text-[10px] font-mono font-semibold border px-2 py-0.5 rounded-md inline-block text-center uppercase tracking-wide ${badgeClass}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
