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
    <div className="page-container flex flex-col gap-6">
      <div className="select-none">
        <h2 className="m-0 text-[20px] font-bold text-zinc-100">Real-Time Security Alerts</h2>
        <p className="text-zinc-400 text-[12px] mt-1">Acknowledge warning indicators and security notifications.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 tracking-wider uppercase select-none font-sans">
          ALERT INCIDENT REGISTER
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase select-none">
                <th className="px-5 py-3.5 font-semibold">Alert ID</th>
                <th className="px-5 py-3.5 font-semibold">Incident Type</th>
                <th className="px-5 py-3.5 font-semibold">Severity</th>
                <th className="px-5 py-3.5 font-semibold">Details Message</th>
                <th className="px-5 py-3.5 font-semibold">Trigger Time</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-zinc-500 text-[12px] font-mono select-none">
                    NO PENDING OR ARCHIVED ALERTS DETECTED
                  </td>
                </tr>
              ) : (
                alerts.map(alert => (
                  <tr key={alert.id} className={`border-b border-zinc-800/40 text-[12.5px] transition-colors duration-150 ${
                    alert.acknowledged ? 'text-zinc-400 hover:bg-zinc-850/10' : 'text-zinc-200 bg-red-500/[0.02] hover:bg-red-500/[0.04]'
                  }`}>
                    <td className="px-5 py-3.5 font-mono text-zinc-500">A-{alert.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-100">{alert.type}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={alert.severity} /></td>
                    <td className="px-5 py-3.5 text-zinc-300">{alert.message}</td>
                    <td className="px-5 py-3.5 text-[11.5px] text-zinc-500 font-mono">{new Date(alert.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      {alert.acknowledged ? (
                        <span className="text-zinc-500 flex items-center gap-1 text-[10px] font-semibold select-none">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> ACKNOWLEDGED
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1 text-[10px] font-semibold select-none">
                          <Info className="w-3.5 h-3.5" /> UNACKNOWLEDGED
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 px-3 py-1.5 rounded-lg cursor-pointer text-[11px] font-semibold uppercase transition-all duration-150"
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
    </div>
  );
};

export default AlertsPage;
