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
    <header className="h-16 bg-bg-input border-b border-border-cyan flex items-center justify-between px-6 box-border select-none">
      <div className="flex items-center gap-3">
        <Shield className="text-accent-cyan w-6 h-6" />
        <span className="text-[16px] font-bold tracking-widest text-white uppercase font-sans">QUANTUMDEFENSE C2</span>
      </div>

      <div className="flex items-center gap-6">
        {/* System Health */}
        <div className="flex items-center gap-2 text-[13px] font-mono bg-accent-green/10 border border-accent-green/20 px-2.5 py-1 rounded text-accent-green">
          <span className="w-2 h-2 rounded-full bg-accent-green"></span>
          SYSTEM: NOMINAL
        </div>

        {/* UTC Clock */}
        <div className="font-mono text-[13px] text-accent-cyan">
          {utcTime}
        </div>

        {/* User profile / Log out */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[14px] font-semibold text-white">{user.name}</div>
              <div className="text-[11px] font-mono text-accent-cyan tracking-wide">{user.role.toUpperCase()}</div>
            </div>
            <button
              onClick={logout}
              title="Logout session"
              className="bg-transparent border-none cursor-pointer text-white/40 p-1 flex items-center justify-center transition-colors duration-250 hover:text-accent-red"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
