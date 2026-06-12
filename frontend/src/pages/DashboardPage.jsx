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
      const color = isFriendly ? '#00d4ff' : '#ff3366';
      
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid #ffffff;
          box-shadow: 0 0 6px ${color};
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const popupContent = `
        <div style="font-family: var(--font-sans); color: #0a1628; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px;">${asset.name}</h4>
          <p style="margin: 0 0 2px 0; font-size: 11px;"><b>Type:</b> ${asset.type}</p>
          <p style="margin: 0 0 2px 0; font-size: 11px;"><b>Speed:</b> ${asset.speed} knots</p>
          <p style="margin: 0; font-size: 11px;"><b>Fuel:</b> ${asset.fuel}%</p>
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
          <div style="font-family: var(--font-sans); color: #0a1628; padding: 4px;">
            <h4 style="margin: 0 0 4px 0; font-size: 13px;">${updatedAsset.name}</h4>
            <p style="margin: 0 0 2px 0; font-size: 11px;"><b>Type:</b> ${updatedAsset.type}</p>
            <p style="margin: 0 0 2px 0; font-size: 11px;"><b>Speed:</b> ${updatedAsset.speed} knots</p>
            <p style="margin: 0; font-size: 11px;"><b>Fuel:</b> ${updatedAsset.fuel}%</p>
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
    <div className="grid grid-rows-[auto_1fr] h-full gap-5 overflow-hidden p-6 box-border">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <DataCard title="Global Readiness">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-3xl font-bold font-mono text-accent-green">
              {stats.readinessIndex}%
            </span>
            <Activity className="text-accent-green w-8 h-8" />
          </div>
        </DataCard>

        <DataCard title="Global Threat Level">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className={`text-3xl font-bold font-mono ${stats.globalThreatLevel > 50 ? 'text-accent-red' : 'text-accent-amber'}`}>
              {stats.globalThreatLevel}%
            </span>
            <ShieldAlert className={`${stats.globalThreatLevel > 50 ? 'text-accent-red' : 'text-accent-amber'} w-8 h-8`} />
          </div>
        </DataCard>

        <DataCard title="Active Assets">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-3xl font-bold font-mono text-accent-cyan">
              {stats.assets.active} <span className="text-[14px] text-white/40">/ {stats.assets.total}</span>
            </span>
            <Shield className="text-accent-cyan w-8 h-8" />
          </div>
        </DataCard>

        <DataCard title="Operational Domains">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-3xl font-bold font-mono text-white">
              {stats.domains}
            </span>
            <Crosshair className="text-white/40 w-8 h-8" />
          </div>
        </DataCard>

        <DataCard title="Total Units">
          <div className="flex items-center justify-between mt-1 select-none">
            <span className="text-3xl font-bold font-mono text-white">
              {stats.units}
            </span>
            <HelpCircle className="text-white/40 w-8 h-8" />
          </div>
        </DataCard>
      </div>

      {/* Main Grid: Map & Alerts */}
      <div className="grid grid-cols-3 gap-5 overflow-hidden">
        {/* Map Panel */}
        <div className="col-span-2 bg-bg-card border border-border-cyan rounded flex flex-col overflow-hidden relative">
          <div className="px-4 py-3 border-b border-white/5 text-[12px] font-semibold uppercase text-accent-cyan tracking-wider select-none font-sans">
            TACTICAL COMMON OPERATING PICTURE (COP)
          </div>
          <div ref={mapContainerRef} className="flex-1 z-0" />
        </div>

        {/* Live Alerts Feed Panel */}
        <div className="bg-bg-card border border-border-cyan rounded flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-[12px] font-semibold uppercase text-accent-cyan tracking-wider select-none font-sans">
            LIVE ALERTS TICKER
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {alerts.length === 0 ? (
              <div className="text-white/30 text-center py-6 text-[13px] font-mono select-none">
                NO SECURITY ALERTS DETECTED
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`p-3 bg-bg-input/60 rounded-r border-l-4 ${
                  alert.severity === 'Critical' || alert.severity === 'High' ? 'border-accent-red' : 'border-accent-amber'
                }`}>
                  <div className="flex justify-between mb-1 select-none">
                    <span className="font-semibold text-white text-[13px]">{alert.type}</span>
                    <StatusBadge status={alert.severity} />
                  </div>
                  <div className="text-white/70 text-[12px] leading-relaxed">{alert.message}</div>
                  <div className="text-[10px] font-mono text-white/30 mt-1.5 text-right select-none">
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
