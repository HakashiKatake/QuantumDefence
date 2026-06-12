import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import DataCard from '../components/common/DataCard.jsx';
import { Target, Plus, CheckCircle, XCircle, Play } from 'lucide-react';

export const MissionsPage = () => {
  const { token, user } = useAuth();
  const [missions, setMissions] = useState([]);
  const [units, setUnits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState('1');
  const [priority, setPriority] = useState('Medium');
  const [objective, setObjective] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [unitRole, setUnitRole] = useState('Primary Attack');

  const fetchMissions = async () => {
    try {
      const response = await fetch('/api/missions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setMissions(result.data);
    } catch (err) {
      console.error('Failed to load missions:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setUnits(result.data);
        if (result.data.length > 0) setSelectedUnit(result.data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  };

  useEffect(() => {
    fetchMissions();
    fetchUnits();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name,
        domainId: parseInt(domainId),
        status: 'Planning',
        priority,
        objective,
        units: selectedUnit ? [{ unitId: parseInt(selectedUnit), role: unitRole }] : []
      };

      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        setShowForm(false);
        setName('');
        setObjective('');
        fetchMissions();
      } else {
        alert(result.message || 'Failed to create mission');
      }
    } catch (err) {
      console.error('Create mission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`/api/missions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        fetchMissions();
      } else {
        alert(result.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const isCommanderOrAdmin = user && ['Commander', 'Admin'].includes(user.role);

  return (
    <div className="page-container flex flex-col gap-5">
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="m-0 text-[22px] font-bold text-white">Tactical Mission Operations</h2>
          <p className="text-white/40 text-[13px] mt-1">Define, deploy, and track military objectives across domains.</p>
        </div>
        
        {isCommanderOrAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-transparent border border-accent-cyan text-accent-cyan px-4 py-2 rounded cursor-pointer font-semibold text-[13px] uppercase transition-all duration-200 hover:bg-accent-cyan hover:text-bg-main"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel Form' : 'New Mission'}
          </button>
        )}
      </div>

      {/* New Mission Form */}
      {showForm && (
        <DataCard title="CREATE NEW OPERATIONAL MISSION PLAN">
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">MISSION NAME</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Operation Eagle Strike" className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">SECTOR DOMAIN</label>
              <select value={domainId} onChange={(e) => setDomainId(e.target.value)} className={inputClass}>
                <option value="1">Land Force</option>
                <option value="2">Air Force</option>
                <option value="3">Naval Fleet</option>
                <option value="4">Cyber Warfare Command</option>
                <option value="5">Space Command</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">PRIORITY RANK</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">ASSIGN TACTICAL UNIT</label>
              <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className={inputClass}>
                <option value="">No unit assigned</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.callsign})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">ASSIGNED UNIT ROLE</label>
              <select value={unitRole} onChange={(e) => setUnitRole(e.target.value)} className={inputClass}>
                <option value="Primary Attack">Primary Attack</option>
                <option value="Defense">Defense Screen</option>
                <option value="Recon">Reconnaissance</option>
                <option value="Support">Operational Support</option>
              </select>
            </div>

            <div className="col-span-3">
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">STRATEGIC OBJECTIVE STATEMENT</label>
              <textarea required value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Provide concrete objectives..." className={`${inputClass} h-[60px] py-2 resize-none`} />
            </div>

            <div className="col-span-3 flex justify-end">
              <button type="submit" disabled={loading} className="bg-accent-cyan border-none text-bg-main px-6 py-2.5 rounded cursor-pointer font-bold text-[13px] uppercase font-sans">
                {loading ? 'Submitting...' : 'File Mission Directive'}
              </button>
            </div>
          </form>
        </DataCard>
      )}

      {/* Missions Grid List */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
        {missions.length === 0 ? (
          <div className="col-span-3 bg-bg-card border border-border-cyan rounded p-9 text-center text-white/30 text-[13px] font-mono select-none">
            NO ACTIVE OR ARCHIVED MISSIONS FOUND
          </div>
        ) : (
          missions.map(mission => (
            <DataCard key={mission.id} title={mission.name} className="gap-3">
              <div className="flex justify-between items-center select-none">
                <span className="text-[11px] font-mono text-white/40">M-ID: {mission.id}</span>
                <div className="flex gap-2">
                  <span className="text-[11px] font-semibold text-accent-cyan uppercase">{mission.priority}</span>
                  <StatusBadge status={mission.status} />
                </div>
              </div>

              <div className="pb-2.5 border-b border-white/5">
                <div className="text-[11px] text-accent-cyan mb-1 font-semibold uppercase tracking-wider">OBJECTIVE</div>
                <div className="text-[13px] leading-relaxed text-white/80">{mission.objective}</div>
              </div>

              <div>
                <div className="text-[11px] text-accent-cyan mb-1 font-semibold uppercase tracking-wider select-none">ASSIGNED FORCE ASSETS</div>
                <div className="text-[12px] font-mono">
                  {mission.units && mission.units.length > 0 ? (
                    mission.units.map(mu => {
                      const matchedUnit = units.find(u => u.id === mu.unitId);
                      return (
                        <div key={mu.id} className="flex justify-between py-0.5">
                          <span className="text-white">{matchedUnit ? matchedUnit.name : `Unit #${mu.unitId}`}</span>
                          <span className="text-white/30">[{mu.role}]</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-white/30 italic">No force assets currently attached</span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-white/30 font-mono flex justify-between mt-1.5 select-none">
                <span>START: {new Date(mission.startDate).toISOString().substring(0, 10)}</span>
                {mission.endDate && <span>END: {new Date(mission.endDate).toISOString().substring(0, 10)}</span>}
              </div>

              {/* Status transition actions */}
              {isCommanderOrAdmin && mission.status !== 'Completed' && mission.status !== 'Failed' && (
                <div className="flex gap-2 mt-2 border-t border-white/5 pt-3">
                  {mission.status === 'Planning' && (
                    <button
                      onClick={() => updateStatus(mission.id, 'Active')}
                      className="flex-1 h-7 bg-transparent border rounded cursor-pointer text-[11px] font-semibold uppercase inline-flex items-center justify-center gap-1 transition-all duration-200 border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg-main"
                    >
                      <Play className="w-3 h-3" /> Activate
                    </button>
                  )}
                  {mission.status === 'Active' && (
                    <>
                      <button
                        onClick={() => updateStatus(mission.id, 'Completed')}
                        className="flex-1 h-7 bg-transparent border rounded cursor-pointer text-[11px] font-semibold uppercase inline-flex items-center justify-center gap-1 transition-all duration-200 border-accent-green text-accent-green hover:bg-accent-green hover:text-bg-main"
                      >
                        <CheckCircle className="w-3 h-3" /> Succeed
                      </button>
                      <button
                        onClick={() => updateStatus(mission.id, 'Failed')}
                        className="flex-1 h-7 bg-transparent border rounded cursor-pointer text-[11px] font-semibold uppercase inline-flex items-center justify-center gap-1 transition-all duration-200 border-accent-red text-accent-red hover:bg-accent-red hover:text-white"
                      >
                        <XCircle className="w-3 h-3" /> Abort
                      </button>
                    </>
                  )}
                </div>
              )}
            </DataCard>
          ))
        )}
      </div>
    </div>
  );
};

const inputClass = "w-full h-9 bg-bg-input border border-border-cyan rounded text-white px-3 box-border outline-none text-[13px] font-sans focus:border-accent-cyan";

export default MissionsPage;
