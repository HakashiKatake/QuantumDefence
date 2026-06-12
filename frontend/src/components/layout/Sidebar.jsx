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
    <aside className="w-60 bg-bg-input border-r border-border-cyan flex flex-col py-6 box-border h-full select-none">
      <div className="px-6 pb-6 border-b border-white/5 mb-4">
        <div className="text-[11px] font-mono text-white/40 tracking-wider">CLEARANCE LEVEL</div>
        <div className="text-[13px] font-bold text-accent-amber mt-1 tracking-wide">
          {user && user.role === 'Commander' ? 'TOP SECRET // C2' : 'SECRET // REL TO USA'}
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded text-[14px] font-medium transition-all duration-200 border-l-3
                ${isActive 
                  ? 'text-white bg-accent-cyan/10 border-accent-cyan font-semibold' 
                  : 'text-white/50 border-transparent hover:text-white hover:bg-white/2'}
              `}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto px-6 text-[11px] text-white/30 font-mono tracking-wider">
        <div>v1.0.0-RELEASE</div>
        <div>STATION ID: C2-NODE-01</div>
      </div>
    </aside>
  );
};

export default Sidebar;
