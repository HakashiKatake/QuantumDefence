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
    <div className="page-container flex flex-col gap-6">
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="m-0 text-[20px] font-bold text-zinc-100">Military Asset Inventory</h2>
          <p className="text-zinc-400 text-[12px] mt-1">Monitor operational friendly units and assets deployed in theater.</p>
        </div>
        
        {isOperatorOrAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-transparent border border-zinc-800 text-zinc-300 px-4 py-2 rounded-lg cursor-pointer font-semibold text-[12px] uppercase transition-all duration-150 hover:bg-zinc-800 hover:text-zinc-100"
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
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">ASSET NAME / CALLSIGN</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Eagle-One" className={inputClass} />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">ASSET TYPE</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                <option value="Jet">Fighter Jet</option>
                <option value="Tank">MBT Tank</option>
                <option value="Destroyer">Destroyer Ship</option>
                <option value="Satellite">C2 Satellite</option>
                <option value="Server">Cyber Defense Server</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">ATTACH TO MILITARY UNIT</label>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass}>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.callsign})</option>
                ))}
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
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">INITIAL LATITUDE</label>
              <input type="number" step="0.00001" required value={lat} onChange={(e) => setLat(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">INITIAL LONGITUDE</label>
              <input type="number" step="0.00001" required value={lng} onChange={(e) => setLng(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">INITIAL VELOCITY (SPEED)</label>
              <input type="number" required value={speed} onChange={(e) => setSpeed(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">INITIAL COMPASS HEADING</label>
              <input type="number" min="0" max="359" required value={heading} onChange={(e) => setHeading(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1.5 font-semibold">OPERATIONAL STATUS</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="Active">Active / Operational</option>
                <option value="Standby">Standby / Reserve</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div className="col-span-3 flex justify-end">
              <button type="submit" disabled={loading} className="bg-zinc-100 border border-zinc-100 text-zinc-900 hover:bg-zinc-200 hover:border-zinc-200 px-5 py-2 rounded-lg cursor-pointer font-bold text-[12px] uppercase tracking-wider transition-colors duration-150">
                {loading ? 'Registering...' : 'Commission Asset'}
              </button>
            </div>
          </form>
        </DataCard>
      )}

      {/* Assets Grid List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 text-[10px] font-bold text-zinc-400 tracking-wider uppercase select-none font-sans">
          ACTIVE COMBAT ASSET REGISTRY
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase select-none">
                <th className="px-5 py-3.5 font-semibold">Asset ID</th>
                <th className="px-5 py-3.5 font-semibold">Callsign</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Unit Attached</th>
                <th className="px-5 py-3.5 font-semibold">Coordinates</th>
                <th className="px-5 py-3.5 font-semibold">Heading / Speed</th>
                <th className="px-5 py-3.5 font-semibold">Fuel / Ammo</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                {isOperatorOrAdmin && <th className="px-5 py-3.5 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={isOperatorOrAdmin ? 9 : 8} className="px-5 py-8 text-center text-zinc-500 text-[12px] font-mono select-none">
                    NO FRIENDLY ASSETS DEPLOYED IN THEATER
                  </td>
                </tr>
              ) : (
                assets.map(asset => (
                  <tr key={asset.id} className="border-b border-zinc-800/40 text-[12.5px] text-zinc-300 hover:bg-zinc-850/20">
                    <td className="px-5 py-3.5 font-mono text-zinc-400">A-{asset.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-100">{asset.name}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{asset.type}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{asset.unit ? asset.unit.name : `Unit #${asset.unitId}`}</td>
                    <td className="px-5 py-3.5 font-mono text-zinc-400">{asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}</td>
                    <td className="px-5 py-3.5 font-mono text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-zinc-400" />
                        {asset.heading}° / {asset.speed} kn
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px]">
                      <span className={asset.fuel < 30 ? 'text-red-400' : 'text-emerald-500'}>F: {asset.fuel.toFixed(0)}%</span>
                      <span className="text-zinc-600 mx-1">/</span>
                      <span className="text-zinc-400">A: {asset.ammo.toFixed(0)}%</span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={asset.status} /></td>
                    {isOperatorOrAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => deleteAsset(asset.id)}
                          className="bg-transparent border border-zinc-800 hover:border-red-500/30 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 cursor-pointer p-1.5 rounded-lg inline-flex items-center justify-center transition-all duration-150"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};

const inputClass = "w-full h-9 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 px-3 box-border outline-none text-[13px] font-sans focus:border-zinc-700 transition-colors duration-150";

export default AssetsPage;
