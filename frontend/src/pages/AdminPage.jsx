import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, Terminal } from 'lucide-react';

export const AdminPage = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const mockLogs = [
      { id: 1, userId: 1, action: 'LOGIN', resource: 'Session', details: 'User logged in successfully', timestamp: new Date(Date.now() - 500000).toISOString() },
      { id: 2, userId: 2, action: 'TELEMETRY_UPDATE', resource: 'Asset', details: 'Telemetry updated for A-3 (Fighter Jet)', timestamp: new Date(Date.now() - 400000).toISOString() },
      { id: 3, userId: 3, action: 'THREAT_DETECTION', resource: 'Threat', details: 'Registered Hostile-Jet-A in sector Air', timestamp: new Date(Date.now() - 300000).toISOString() },
      { id: 4, userId: 1, action: 'MISSION_CREATE', resource: 'Mission', details: 'Mission M-1 created (Operation Eagle Strike)', timestamp: new Date(Date.now() - 200000).toISOString() },
      { id: 5, userId: 2, action: 'THREAT_NEUTRALIZE', resource: 'Threat', details: 'Target Hostile-Jet-A status set to Neutralized', timestamp: new Date(Date.now() - 100000).toISOString() }
    ];
    setLogs(mockLogs);
  }, [token]);

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="select-none">
        <h2 className="m-0 text-[20px] font-bold text-zinc-100">System Log Audit Panel</h2>
        <p className="text-zinc-400 text-[12px] mt-1">Audit user actions, access control grants, and container event streams.</p>
      </div>

      <div className="grid grid-cols-3 gap-6 overflow-hidden">
        {/* Audit Logs Table */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 tracking-wider uppercase select-none font-sans">
            SECURITY AUDIT STREAM
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase select-none">
                  <th className="px-5 py-3.5 font-semibold">Log ID</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                  <th className="px-5 py-3.5 font-semibold">Resource</th>
                  <th className="px-5 py-3.5 font-semibold">Message Details</th>
                  <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-zinc-800/40 text-[12.5px] text-zinc-300 hover:bg-zinc-850/20">
                    <td className="px-5 py-3.5 font-mono text-zinc-500">L-{log.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-sky-400">{log.action}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{log.resource}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{log.details}</td>
                    <td className="px-5 py-3.5 text-[11.5px] font-mono text-zinc-500">{log.timestamp.replace('T', ' ').substring(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security / System details panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-200 select-none">
              <ShieldCheck className="w-4.5 h-4.5 text-zinc-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider font-sans">SECURE ACCESS CONTEXT</span>
            </div>
            
            <div className="text-[12px] leading-relaxed text-zinc-400">
              All database access passes through Prisma ORM with encryption and dynamic secrets retrieved from HashiCorp Vault.
            </div>

            <div className="border-t border-zinc-800 pt-4 flex flex-col gap-2.5 text-[10.5px] font-mono select-none">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">SSL STATUS:</span>
                <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px] font-bold">ENABLED (TLS 1.3)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">VAULT CONNECTION:</span>
                <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px] font-bold">ESTABLISHED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">ENCRYPTION:</span>
                <span className="text-zinc-300">AES-256-GCM</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-200 select-none">
              <Terminal className="w-4.5 h-4.5 text-zinc-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider font-sans">CONTAINER RUNTIME</span>
            </div>

            <div className="flex flex-col gap-2 text-[10.5px] font-mono select-none">
              <div className="flex justify-between items-center py-1 border-b border-zinc-850">
                <span className="text-zinc-400">auth-service</span>
                <span className="text-emerald-500">RUNNING (:4001)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-850">
                <span className="text-zinc-400">command-service</span>
                <span className="text-emerald-500">RUNNING (:4002)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-850">
                <span className="text-zinc-400">threat-service</span>
                <span className="text-emerald-500">RUNNING (:4003)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400">mission-service</span>
                <span className="text-emerald-500">RUNNING (:4004)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
