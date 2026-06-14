import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Shield, ShieldAlert, Crosshair, HelpCircle, Activity } from 'lucide-react';
import DataCard from '../components/common/DataCard.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import L from 'leaflet';

export const DashboardPage = () => {
  const { token } = useAuth();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  
  const [stats, setStats] = useState({
    domains: 0,
    units: 0,
    assets: { total: 0, active: 0 },
    readinessIndex: 0,
    globalThreatLevel: 0
  });

  const [domains, setDomains] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [assets, setAssets] = useState([]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [statsRes, domainsRes, assetsRes, alertsRes] = await Promise.all([
        fetch('/api/dashboard/overview', { headers }),
        fetch('/api/domains', { headers }),
        fetch('/api/assets', { headers }),
        fetch('/api/alerts', { headers })
      ]);

      const statsData = await statsRes.json();
      const domainsData = await domainsRes.json();
      const assetsData = await assetsRes.json();
      const alertsData = await alertsRes.json();

      if (statsData.success) setStats(statsData.data);
      if (domainsData.success) setDomains(domainsData.data);
      if (assetsData.success) setAssets(assetsData.data);
      if (alertsData.success) setAlerts(alertsData.data.slice(0, 10));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.0, 78.0],
      zoom: 5,
      zoomControl: false
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    assets.forEach(asset => {
      const isFriendly = asset.status === 'Active';
      const color = isFriendly ? '#0ea5e9' : '#ef4444'; // Sky blue / Red
      
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid #ffffff;
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const popupContent = `
        <div style="font-family: var(--font-sans); color: #f4f4f5; padding: 4px; min-width: 130px;">
          <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; border-b: 1px solid #27272a; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">${asset.name}</h4>
          <p style="margin: 0 0 3px 0; font-size: 11px; color: #a1a1aa;"><span style="color: #71717a;">Type:</span> ${asset.type}</p>
          <p style="margin: 0 0 3px 0; font-size: 11px; color: #a1a1aa;"><span style="color: #71717a;">Speed:</span> ${asset.speed} kt</p>
          <p style="margin: 0; font-size: 11px; color: #a1a1aa;"><span style="color: #71717a;">Fuel:</span> ${asset.fuel}%</p>
        </div>
      `;

      const marker = L.marker([asset.lat, asset.lng], { icon: customIcon })
        .addTo(mapRef.current)
        .bindPopup(popupContent);

      markersRef.current[asset.id] = marker;
    });
  }, [assets]);

  useEffect(() => {
    const socket = io('/', { path: '/socket.io' });

    socket.on('telemetry:update', (updatedAsset) => {
      setAssets(prevAssets => {
        const index = prevAssets.findIndex(a => a.id === updatedAsset.id);
        if (index > -1) {
          const updated = [...prevAssets];
          updated[index] = { ...updated[index], ...updatedAsset };
          return updated;
        } else {
          return [...prevAssets, updatedAsset];
        }
      });

      const marker = markersRef.current[updatedAsset.id];
      if (marker) {
        marker.setLatLng([updatedAsset.lat, updatedAsset.lng]);
        marker.setPopupContent(`
          <div style="font-family: var(--font-sans); color: #f4f4f5; padding: 4px; min-width: 130px;">
            <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; border-b: 1px solid #27272a; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">${updatedAsset.name}</h4>
            <p style="margin: 0 0 3px 0; font-size: 11px; color: #a1a1aa;"><span style="color: #71717a;">Type:</span> ${updatedAsset.type}</p>
            <p style="margin: 0 0 3px 0; font-size: 11px; color: #a1a1aa;"><span style="color: #71717a;">Speed:</span> ${updatedAsset.speed} kt</p>
            <p style="margin: 0; font-size: 11px; color: #a1a1aa;"><span style="color: #71717a;">Fuel:</span> ${updatedAsset.fuel}%</p>
          </div>
        `);
      }
    });

    socket.on('alert:new', (newAlert) => {
      setAlerts(prevAlerts => [newAlert, ...prevAlerts.slice(0, 9)]);
      setStats(prevStats => ({
        ...prevStats,
        globalThreatLevel: Math.min(100, prevStats.globalThreatLevel + 2)
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="grid grid-rows-[auto_1fr] h-full gap-6 overflow-hidden p-6 box-border bg-zinc-950">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <DataCard title="Global Readiness">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-2xl font-bold font-mono text-emerald-500">
              {stats.readinessIndex}%
            </span>
            <Activity className="text-emerald-500 w-5 h-5" />
          </div>
        </DataCard>

        <DataCard title="Global Threat Level">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className={`text-2xl font-bold font-mono ${stats.globalThreatLevel > 50 ? 'text-red-500' : 'text-amber-500'}`}>
              {stats.globalThreatLevel}%
            </span>
            <ShieldAlert className={`${stats.globalThreatLevel > 50 ? 'text-red-500' : 'text-amber-500'} w-5 h-5`} />
          </div>
        </DataCard>

        <DataCard title="Active Assets">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-2xl font-bold font-mono text-sky-500">
              {stats.assets.active} <span className="text-[12px] text-zinc-500 font-normal">/ {stats.assets.total}</span>
            </span>
            <Shield className="text-sky-500 w-5 h-5" />
          </div>
        </DataCard>

        <DataCard title="Operational Domains">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {stats.domains}
            </span>
            <Crosshair className="text-zinc-500 w-5 h-5" />
          </div>
        </DataCard>

        <DataCard title="Total Units">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {stats.units}
            </span>
            <HelpCircle className="text-zinc-500 w-5 h-5" />
          </div>
        </DataCard>
      </div>

      {/* Main Grid: Map & Alerts */}
      <div className="grid grid-cols-3 gap-6 overflow-hidden">
        {/* Map Panel */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col overflow-hidden relative">
          <div className="px-5 py-3.5 border-b border-zinc-800 text-[10px] font-bold uppercase text-zinc-400 tracking-wider select-none font-sans">
            TACTICAL COMMON OPERATING PICTURE (COP)
          </div>
          <div ref={mapContainerRef} className="flex-1 z-0" />
        </div>

        {/* Live Alerts Feed Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-800 text-[10px] font-bold uppercase text-zinc-400 tracking-wider select-none font-sans">
            LIVE ALERTS TICKER
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {alerts.length === 0 ? (
              <div className="text-zinc-500 text-center py-8 text-[12px] font-mono select-none">
                NO SECURITY ALERTS DETECTED
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`p-4 bg-zinc-950/60 border border-zinc-850 rounded-lg border-l-4 ${
                  alert.severity === 'Critical' || alert.severity === 'High' ? 'border-l-red-500' : 'border-l-amber-500'
                }`}>
                  <div className="flex justify-between items-start mb-1 select-none">
                    <span className="font-semibold text-zinc-200 text-[12px]">{alert.type}</span>
                    <StatusBadge status={alert.severity} />
                  </div>
                  <div className="text-zinc-400 text-[12px] leading-relaxed">{alert.message}</div>
                  <div className="text-[9px] font-mono text-zinc-600 mt-2 text-right select-none">
                    {new Date(alert.createdAt).toISOString().replace('T', ' ').substring(0, 19)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
