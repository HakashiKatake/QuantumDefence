import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { Check, Info } from 'lucide-react';

export const AlertsPage = () => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setAlerts(result.data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const acknowledgeAlert = async (id) => {
    try {
      const response = await fetch(`/api/alerts/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        fetchAlerts();
      } else {
        alert(result.message || 'Failed to acknowledge alert');
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return (
    <div className="page-container flex flex-col gap-5">
      <div className="select-none">
        <h2 className="m-0 text-[22px] font-bold text-white">Real-Time Security Alerts</h2>
        <p className="text-white/40 text-[13px] mt-1">Acknowledge warning indicators and security notifications.</p>
      </div>

      <div className="bg-bg-card border border-border-cyan rounded overflow-hidden">
        <div className="px-4 py-4 border-b border-white/5 text-[12px] font-semibold text-accent-cyan tracking-wider uppercase select-none font-sans">
          ALERT INCIDENT REGISTER
        </div>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase select-none">
              <th className="px-4 py-3">Alert ID</th>
              <th className="px-4 py-3">Incident Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Details Message</th>
              <th className="px-4 py-3">Trigger Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-white/30 text-[13px] font-mono select-none">
                  NO PENDING OR ARCHIVED ALERTS DETECTED
                </td>
              </tr>
            ) : (
              alerts.map(alert => (
                <tr key={alert.id} className={`border-b border-white/2 text-[13px] transition-colors duration-150 ${
                  alert.acknowledged ? 'bg-transparent' : 'bg-accent-red/2'
                }`}>
                  <td className="px-4 py-3 font-mono">A-{alert.id}</td>
                  <td className="px-4 py-3 font-semibold text-white">{alert.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={alert.severity} /></td>
                  <td className="px-4 py-3 text-white/80">{alert.message}</td>
                  <td className="px-4 py-3 text-[12px]">{new Date(alert.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {alert.acknowledged ? (
                      <span className="text-white/40 flex items-center gap-1 text-[11px] font-semibold select-none">
                        <Check className="w-3.5 h-3.5 text-accent-green" /> ACKNOWLEDGED
                      </span>
                    ) : (
                      <span className="text-accent-amber flex items-center gap-1 text-[11px] font-semibold select-none">
                        <Info className="w-3.5 h-3.5" /> UNACKNOWLEDGED
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="bg-transparent border border-accent-cyan text-accent-cyan px-2.5 py-1 rounded cursor-pointer text-[11px] font-semibold uppercase transition-all duration-200 hover:bg-accent-cyan hover:text-bg-main"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlertsPage;
