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
    <div className="page-container flex flex-col gap-5">
      <div className="select-none">
        <h2 className="m-0 text-[22px] font-bold text-white">System Log Audit Panel</h2>
        <p className="text-white/40 text-[13px] mt-1">Audit user actions, access control grants, and container event streams.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 overflow-hidden">
        {/* Audit Logs Table */}
        <div className="col-span-2 bg-bg-card border border-border-cyan rounded overflow-hidden">
          <div className="px-4 py-4 border-b border-white/5 text-[12px] font-semibold text-accent-cyan tracking-wider uppercase select-none font-sans">
            SECURITY AUDIT STREAM
          </div>

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase select-none">
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Message Details</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-white/2 text-[13px]">
                  <td className="px-4 py-3 font-mono">L-{log.id}</td>
                  <td className="px-4 py-3 font-semibold text-accent-cyan">{log.action}</td>
                  <td className="px-4 py-3">{log.resource}</td>
                  <td className="px-4 py-3 text-white/80">{log.details}</td>
                  <td className="px-4 py-3 text-[12px] font-mono">{log.timestamp.replace('T', ' ').substring(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Security / System details panel */}
        <div className="flex flex-col gap-5">
          <div className="bg-bg-card border border-border-cyan rounded p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-accent-cyan select-none">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[13px] font-bold uppercase tracking-wider font-sans">SECURE ACCESS CONTEXT</span>
            </div>
            
            <div className="text-[12px] leading-relaxed text-white/80">
              All database access passes through Prisma ORM with encryption and dynamic secrets retrieved from HashiCorp Vault.
            </div>

            <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5 text-[11px] font-mono select-none">
              <div className="flex justify-between">
                <span>SSL STATUS:</span>
                <span className="text-accent-green">ENABLED (TLS 1.3)</span>
              </div>
              <div className="flex justify-between">
                <span>VAULT CONNECTION:</span>
                <span className="text-accent-green">ESTABLISHED</span>
              </div>
              <div className="flex justify-between">
                <span>ENCRYPTION ALGORITHM:</span>
                <span>AES-256-GCM</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-border-cyan rounded p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-accent-cyan select-none">
              <Terminal className="w-5 h-5" />
              <span className="text-[13px] font-bold uppercase tracking-wider font-sans">CONTAINER RUNTIME</span>
            </div>

            <div className="flex flex-col gap-1.5 text-[11px] font-mono select-none">
              <div className="flex justify-between">
                <span>auth-service:</span>
                <span className="text-accent-green">RUNNING (:4001)</span>
              </div>
              <div className="flex justify-between">
                <span>command-service:</span>
                <span className="text-accent-green">RUNNING (:4002)</span>
              </div>
              <div className="flex justify-between">
                <span>threat-service:</span>
                <span className="text-accent-green">RUNNING (:4003)</span>
              </div>
              <div className="flex justify-between">
                <span>mission-service:</span>
                <span className="text-accent-green">RUNNING (:4004)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
