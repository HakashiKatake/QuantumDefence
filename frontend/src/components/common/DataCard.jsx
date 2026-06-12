import React from 'react';

export const DataCard = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-bg-card border border-border-cyan rounded p-4 flex flex-col transition-all duration-200 hover:border-border-cyan-hover hover:shadow-[0_0_10px_rgba(0,212,255,0.05)] ${className}`}>
      {title && (
        <div className="text-[12px] font-semibold text-accent-cyan tracking-wider border-b border-white/5 pb-2 mb-3 uppercase font-sans">
          {title}
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};

export default DataCard;
