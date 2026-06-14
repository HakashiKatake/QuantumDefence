import React from 'react';

export const DataCard = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col transition-all duration-150 hover:border-zinc-700 ${className}`}>
      {title && (
        <div className="text-[11px] font-semibold text-zinc-400 tracking-wider border-b border-zinc-800 pb-2.5 mb-4 uppercase font-sans">
          {title}
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};

export default DataCard;
