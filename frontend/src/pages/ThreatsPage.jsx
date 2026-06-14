import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import SeverityIndicator from '../components/common/SeverityIndicator.jsx';
import DataCard from '../components/common/DataCard.jsx';
import { Plus, Crosshair } from 'lucide-react';

export const ThreatsPage = () => {
  const { token, user } = useAuth();
  const [threats, setThreats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Fighter');
  const [severity, setSeverity] = useState('Medium');
  const [domainId, setDomainId] = useState('2');
  const [lat, setLat] = useState('21.0');
  const [lng, setLng] = useState('79.0');
  const [description, setDescription] = useState('');

  const fetchThreats = async () => {
    try {
      const response = await fetch('/api/threats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setThreats(result.data);
      }
    } catch (err) {
      console.error('Failed to load threats:', err);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/threats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          type,
          severity,
          domainId,
          status: 'Detected',
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          description
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowForm(false);
        setName('');
        setDescription('');
        fetchThreats();
      } else {
        alert(result.message || 'Failed to submit threat');
      }
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const neutralizeThreat = async (id) => {
    try {
      const response = await fetch(`/api/threats/${id}/neutralize`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        fetchThreats();
      } else {
        alert(result.message || 'Failed to neutralize threat');
      }
    } catch (err) {
      console.error('Failed to neutralize:', err);
    }
  };

  const isAnalystOrAdmin = user && ['Analyst', 'Admin'].includes(user.role);

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="m-0 text-[20px] font-bold text-zinc-100">Multi-Domain Threat Management</h2>
          <p className="text-zinc-400 text-[12px] mt-1">Monitor, register, and coordinate neutralization of hostile targets.</p>
        </div>
        
        {isAnalystOrAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-transparent border border-zinc-800 text-zinc-300 px-4 py-2 rounded-lg cursor-pointer font-semibold text-[12px] uppercase transition-all duration-150 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel Form' : 'Register Threat'}
          </button>
        )}
      </div>

      {/* Register Threat Form */}
      {showForm && (
        <DataCard title="REGISTER HOSTILE INTEL DETECTED">
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">TARGET DESIGNATION</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Hostile-Jet-A" className={inputClass} />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">THREAT SIGNATURE TYPE</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                <option value="Fighter">Fighter Jet</option>
                <option value="Missile">Ballistic Missile</option>
                <option value="Submarine">Hostile Submarine</option>
                <option value="Malware">Cyber Intrusion Malware</option>
                <option value="Jammer">Radar Jammer Node</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">SEVERITY LEVEL</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputClass}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">SECTOR DOMAIN</label>
              <select value={domainId} onChange={(e) => setDomainId(e.target.value)} className={inputClass}>
                <option value="1">Land Force</option>
                <option value="2">Air Force</option>
                <option value="3">Naval Fleet</option>
                <option value="4">Cyber Warfare Command</option>
                <option value="5">Space Command</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">LATITUDE (COORD X)</label>
              <input type="number" step="0.00001" required value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">LONGITUDE (COORD Y)</label>
              <input type="number" step="0.00001" required value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} />
            </div>

            <div className="col-span-3">
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">INTEL REPORT DETAILS</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Intel narrative..." className={`${inputClass} h-[70px] py-2 resize-none`} />
            </div>

            <div className="col-span-3 flex justify-end">
              <button type="submit" disabled={loading} className="bg-zinc-100 border border-zinc-100 text-zinc-900 hover:bg-zinc-200 hover:border-zinc-200 px-5 py-2 rounded-lg cursor-pointer font-bold text-[12px] uppercase tracking-wider transition-colors duration-150">
                {loading ? 'Transmitting...' : 'Transmit Intel Report'}
              </button>
            </div>
          </form>
        </DataCard>
      )}

      {/* Threats Grid List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 tracking-wider uppercase select-none font-sans">
          ACTIVE HOSTILE TARGET REGISTER
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase select-none">
                <th className="px-5 py-3.5 font-semibold">Target ID</th>
                <th className="px-5 py-3.5 font-semibold">Designation</th>
                <th className="px-5 py-3.5 font-semibold">Signature Type</th>
                <th className="px-5 py-3.5 font-semibold">Severity</th>
                <th className="px-5 py-3.5 font-semibold">Coordinates</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Detected Time</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {threats.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-8 text-center text-zinc-500 text-[12px] font-mono select-none">
                    NO THREAT OBJECTS REGISTERED IN SYSTEM
                  </td>
                </tr>
              ) : (
                threats.map(threat => (
                  <tr key={threat.id} className="border-b border-zinc-800/40 text-[12.5px] text-zinc-300 hover:bg-zinc-850/20">
                    <td className="px-5 py-3.5 font-mono text-zinc-400">T-{threat.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-100">{threat.name}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{threat.type}</td>
                    <td className="px-5 py-3.5"><SeverityIndicator severity={threat.severity} /></td>
                    <td className="px-5 py-3.5 font-mono text-zinc-400">{threat.lat.toFixed(4)}, {threat.lng.toFixed(4)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={threat.status} /></td>
                    <td className="px-5 py-3.5 text-[11.5px] text-zinc-400">{new Date(threat.detectedAt).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      {threat.status !== 'Neutralized' && (
                        <button
                          onClick={() => neutralizeThreat(threat.id)}
                          className="bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg cursor-pointer text-[11px] font-semibold uppercase inline-flex items-center gap-1.5 transition-all duration-150"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          Neutralize
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

const inputClass = "w-full h-9 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 px-3 box-border outline-none text-[13px] font-sans focus:border-zinc-700 transition-colors duration-150";

export default ThreatsPage;
