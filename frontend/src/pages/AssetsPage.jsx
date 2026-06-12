import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import DataCard from '../components/common/DataCard.jsx';
import { Plus, Trash2, Shield, Compass } from 'lucide-react';

export const AssetsPage = () => {
  const { token, user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [units, setUnits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Jet');
  const [unitId, setUnitId] = useState('');
  const [domainId, setDomainId] = useState('2');
  const [status, setStatus] = useState('Active');
  const [lat, setLat] = useState('20.0');
  const [lng, setLng] = useState('78.0');
  const [speed, setSpeed] = useState('450');
  const [heading, setHeading] = useState('90');

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setAssets(result.data);
    } catch (err) {
      console.error('Failed to load assets:', err);
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
        if (result.data.length > 0) setUnitId(result.data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchUnits();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          type,
          unitId: parseInt(unitId),
          domainId: parseInt(domainId),
          status,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          speed: parseFloat(speed),
          heading: parseFloat(heading),
          fuel: 100.0,
          ammo: 100.0
        })
      });

      const result = await response.json();
      if (result.success) {
        setShowForm(false);
        setName('');
        fetchAssets();
      } else {
        alert(result.message || 'Failed to add asset');
      }
    } catch (err) {
      console.error('Add asset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to decommission this asset?')) return;

    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        fetchAssets();
      } else {
        alert(result.message || 'Failed to delete asset');
      }
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const isOperatorOrAdmin = user && ['Operator', 'Admin'].includes(user.role);

  return (
    <div className="page-container flex flex-col gap-5">
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="m-0 text-[22px] font-bold text-white">Military Asset Inventory</h2>
          <p className="text-white/40 text-[13px] mt-1">Monitor operational friendly units and assets deployed in theater.</p>
        </div>
        
        {isOperatorOrAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-transparent border border-accent-cyan text-accent-cyan px-4 py-2 rounded cursor-pointer font-semibold text-[13px] uppercase transition-all duration-200 hover:bg-accent-cyan hover:text-bg-main"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel Form' : 'Register Asset'}
          </button>
        )}
      </div>

      {/* Add Asset Form */}
      {showForm && (
        <DataCard title="REGISTER ACTIVE FRIENDLY COMBAT ASSET">
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">ASSET NAME / CALLSIGN</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Eagle-One" className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">ASSET TYPE</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                <option value="Jet">Fighter Jet</option>
                <option value="Tank">MBT Tank</option>
                <option value="Destroyer">Destroyer Ship</option>
                <option value="Satellite">C2 Satellite</option>
                <option value="Server">Cyber Defense Server</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">ATTACH TO MILITARY UNIT</label>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass}>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.callsign})</option>
                ))}
              </select>
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
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">INITIAL LATITUDE</label>
              <input type="number" step="0.00001" required value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">INITIAL LONGITUDE</label>
              <input type="number" step="0.00001" required value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">INITIAL VELOCITY (SPEED)</label>
              <input type="number" required value={speed} onChange={(e) => setSpeed(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">INITIAL COMPASS HEADING</label>
              <input type="number" min="0" max="359" required value={heading} onChange={(e) => setHeading(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[11px] text-accent-cyan mb-1 font-semibold">OPERATIONAL STATUS</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="Active">Active / Operational</option>
                <option value="Standby">Standby / Reserve</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div className="col-span-3 flex justify-end">
              <button type="submit" disabled={loading} className="bg-accent-cyan border-none text-bg-main px-6 py-2.5 rounded cursor-pointer font-bold text-[13px] uppercase font-sans">
                {loading ? 'Registering...' : 'Commission Asset'}
              </button>
            </div>
          </form>
        </DataCard>
      )}

      {/* Assets Grid List */}
      <div className="bg-bg-card border border-border-cyan rounded overflow-hidden">
        <div className="px-4 py-4 border-b border-white/5 text-[12px] font-semibold text-accent-cyan tracking-wider uppercase select-none font-sans">
          ACTIVE COMBAT ASSET REGISTRY
        </div>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/5 text-[11px] text-white/40 uppercase select-none">
              <th className="px-4 py-3">Asset ID</th>
              <th className="px-4 py-3">Callsign</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Unit Attached</th>
              <th className="px-4 py-3">Coordinates</th>
              <th className="px-4 py-3">Heading / Speed</th>
              <th className="px-4 py-3">Fuel / Ammo</th>
              <th className="px-4 py-3">Status</th>
              {isOperatorOrAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={isOperatorOrAdmin ? 9 : 8} className="px-4 py-6 text-center text-white/30 text-[13px] font-mono select-none">
                  NO FRIENDLY ASSETS DEPLOYED IN THEATER
                </td>
              </tr>
            ) : (
              assets.map(asset => (
                <tr key={asset.id} className="border-b border-white/2 text-[13px]">
                  <td className="px-4 py-3 font-mono">A-{asset.id}</td>
                  <td className="px-4 py-3 font-semibold text-white">{asset.name}</td>
                  <td className="px-4 py-3">{asset.type}</td>
                  <td className="px-4 py-3">{asset.unit ? asset.unit.name : `Unit #${asset.unitId}`}</td>
                  <td className="px-4 py-3 font-mono">{asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono flex items-center gap-1.5 border-b-0">
                    <Compass className="w-3.5 h-3.5 text-accent-cyan" />
                    {asset.heading}° / {asset.speed} kn
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className={asset.fuel < 30 ? 'text-accent-red' : 'text-accent-green'}>F: {asset.fuel.toFixed(0)}%</span> / A: {asset.ammo.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                  {isOperatorOrAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteAsset(asset.id)}
                        className="bg-transparent border-none text-white/40 cursor-pointer p-1 inline-flex items-center justify-center transition-colors duration-200 hover:text-accent-red"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const inputClass = "w-full h-9 bg-bg-input border border-border-cyan rounded text-white px-3 box-border outline-none text-[13px] font-sans focus:border-accent-cyan";

export default AssetsPage;
