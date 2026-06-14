import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Shield, LogOut } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 box-border select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-zinc-800 border border-zinc-700">
          <Shield className="text-zinc-100 w-4 h-4" />
        </div>
        <span className="text-[14px] font-bold tracking-widest text-zinc-100 uppercase font-sans">QUANTUMDEFENSE C2</span>
      </div>

      <div className="flex items-center gap-6">
        {/* System Health */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          SYSTEM: NOMINAL
        </div>

        {/* UTC Clock */}
        <div className="font-mono text-[12px] text-zinc-400 bg-zinc-950/40 px-2.5 py-1 rounded border border-zinc-800/40">
          {utcTime}
        </div>

        {/* User profile / Log out */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[13px] font-semibold text-zinc-200">{user.name}</div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{user.role}</div>
            </div>
            <button
              onClick={logout}
              title="Logout session"
              className="bg-zinc-800 border border-zinc-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 cursor-pointer text-zinc-400 p-1.5 rounded-md flex items-center justify-center transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
