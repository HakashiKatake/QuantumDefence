import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Radio, Target, Bell, Shield, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Threats', path: '/threats', icon: Radio },
    { name: 'Missions', path: '/missions', icon: Target },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'Assets', path: '/assets', icon: Shield }
  ];

  if (user && user.role === 'Admin') {
    navItems.push({ name: 'System Logs', path: '/admin', icon: Settings });
  }

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col py-6 box-border h-full select-none">
      <div className="px-6 pb-6 border-b border-zinc-800 mb-6">
        <div className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase">Access Clearance</div>
        <div className={`mt-2 px-3 py-1.5 rounded text-[11px] font-mono font-bold tracking-wider text-center border ${
          user && user.role === 'Commander' 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
            : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500'
        }`}>
          {user && user.role === 'Commander' ? 'TOP SECRET // C2' : 'SECRET // REL TO USA'}
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150
                ${isActive 
                  ? 'text-zinc-50 bg-zinc-800 border-l-2 border-accent-cyan font-semibold' 
                  : 'text-zinc-400 border-l-2 border-transparent hover:text-zinc-100 hover:bg-zinc-800/50'}
              `}
            >
              <Icon className="w-4.5 h-4.5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto px-6 text-[10px] text-zinc-500 font-mono tracking-wider flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>C2-NODE-01 // ACTIVE</span>
        </div>
        <div>SECURE LINK ENGAGED</div>
        <div className="text-[9px] text-zinc-600 mt-1">v1.0.0-RELEASE</div>
      </div>
    </aside>
  );
};

export default Sidebar;
