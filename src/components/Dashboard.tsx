/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  Bell, 
  MapPin, 
  Shield, 
  Settings, 
  Radio, 
  History,
  LifeBuoy,
  Wifi,
  Database,
  Activity,
  Eye,
  Crosshair,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Detector from './Detector';
import type { Alert, HelpCenter } from '../types';

const MOCK_HELP_CENTERS: HelpCenter[] = [
  { id: '1', name: 'Emergency Dispatch A', distance: '0.8km', status: 'active', location: { x: 75, y: 30 } },
  { id: '2', name: 'Highway Patrol Hub', distance: '1.2km', status: 'busy', location: { x: 20, y: 65 } },
  { id: '3', name: 'Westside Med Center', distance: '2.5km', status: 'active', location: { x: 45, y: 85 } }
];

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'nominal' | 'alerting'>('nominal');
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [nightVision, setNightVision] = useState(false);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState('00:00:00');
  const [isDemoMode, setIsDemoMode] = useState(false);

  const exportReport = () => {
    const reportData = {
      sessionStart: new Date(startTime).toISOString(),
      totalVehicles,
      avgSpeed: avgSpeed.toFixed(2),
      alerts: alerts.length,
      platform: 'EagleEye_v2.4_Hackathon'
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patrol_report_${Date.now()}.json`;
    a.click();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Date.now() - startTime;
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location permission denied.")
      );
    }
    return () => clearInterval(timer);
  }, [startTime]);

  const addAlert = useCallback((newAlert: Alert) => {
// ... existing addAlert logic ...
    setAlerts(prev => [newAlert, ...prev].slice(0, 10));
    setIsBuzzerActive(true);
    setSystemStatus('alerting');
    setTrackingId('1'); // Automatically track nearest on alert
    
    // Physical Buzzer Simulation (Web Audio)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio buzzer not supported/initialized');
    }

    setTimeout(() => {
      setIsBuzzerActive(false);
      setSystemStatus('nominal');
    }, 3000);
  }, []);

  const handleTrackCenter = (id: string) => {
    setTrackingId(id);
  };

  return (
    <div className={`w-full h-screen bg-app-bg text-gray-400 font-sans flex flex-col overflow-hidden select-none ${nightVision ? 'text-brand-night' : ''}`}>
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-app-header shrink-0 relative overflow-hidden">
        {/* Animated Background Logo Polish */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_50%,#FFD029_0%,transparent_15%)]" />
        </div>

        <div className="flex items-center gap-5">
          {/* Brand Logo Composite */}
          <div className="relative flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 group cursor-crosshair">
             <div className="absolute inset-0 bg-brand-yellow/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
             <div className="relative">
               <Eye className={`w-6 h-6 ${nightVision ? 'text-brand-night' : 'text-brand-yellow'} transition-colors`} />
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="absolute -inset-1.5 border border-dashed border-white/20 rounded-full" 
               />
               <Crosshair className={`absolute -inset-0.5 w-7 h-7 text-white/20`} />
             </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${nightVision ? 'bg-brand-night shadow-[0_0_10px_#00FF41]' : 'bg-brand-red shadow-[0_0_10px_rgba(239,68,68,0.5)]'} ${systemStatus === 'alerting' ? 'animate-pulse' : ''}`}></div>
              <span className={`text-white font-bold tracking-widest uppercase text-sm ${nightVision ? 'text-brand-night' : ''}`}>EagleEye Sentinel</span>
            </div>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.3em]">Autonomous Patrol Core v2.4</span>
          </div>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-mono tracking-widest text-gray-500">
          <div className="hidden md:flex flex-col items-end">
            <span className={`text-white ${nightVision ? 'text-brand-night' : ''}`}>
              {location ? `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° W` : '37.7749° N, 122.4194° W'}
            </span>
            <span className="uppercase text-[9px]">{location ? 'LOC_DEVICE_GEOFENCE' : 'LOC_PRIMARY_STATION'}</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>
          <div className="text-right hidden sm:block">
            <div className={`text-white uppercase ${nightVision ? 'text-brand-night' : ''}`}>{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
            <div className="flex items-center justify-end gap-2 text-[10px]">
              <span className="text-emerald-500 font-bold opacity-80 uppercase tracking-tighter">Latency: {Math.floor(Math.random() * 20) + 10}ms</span>
              <div className="w-[1px] h-2 bg-white/10" />
              <span>{new Date().toLocaleTimeString('en-US', { hour12: false })} UTC</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* Camera Feed Column */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-4 overflow-hidden h-full">
          <Detector 
            onAlert={addAlert} 
            isBuzzerActive={isBuzzerActive} 
            nightVision={nightVision}
            isDemoMode={isDemoMode}
            onStatsUpdate={(count, avg) => {
              setTotalVehicles(count);
              setAvgSpeed(avg);
            }} 
          />
          
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-4 gap-4 h-24 shrink-0">
            {[
              { icon: Shield, label: 'Patrol State', value: systemStatus === 'nominal' ? 'SECURE' : 'THREAT', color: systemStatus === 'nominal' ? 'text-emerald-500' : 'text-brand-red' },
              { icon: Radio, label: 'Vehicle Count', value: totalVehicles, color: 'text-brand-yellow' },
              { icon: Activity, label: 'Avg Velocity', value: `${avgSpeed.toFixed(1)} KM/H`, color: 'text-white' },
              { icon: Settings, label: 'Sensor Mode', value: nightVision ? 'IR/THERMAL' : 'VISIBLE', color: nightVision ? 'text-brand-night' : 'text-gray-400' }
            ].map((metric, i) => (
              <div key={i} className="bg-app-card border border-white/10 rounded-2xl p-4 flex flex-col justify-center">
                 <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1 flex items-center gap-2">
                   <metric.icon className="w-2.5 h-2.5" />
                   {metric.label}
                 </div>
                 <div className={`text-lg font-mono font-bold ${nightVision ? 'text-brand-night' : metric.color}`}>{metric.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Sidebar */}
        <aside className="hidden lg:col-span-4 lg:flex flex-col gap-6 overflow-hidden h-full">
          {/* Tactical Controls */}
          <div className="bg-app-card border border-white/10 rounded-2xl p-4 shrink-0">
            <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${nightVision ? 'text-brand-night' : 'text-white'}`}>Tactical Controls</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button 
                onClick={() => setNightVision(!nightVision)}
                className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex flex-col items-center gap-2 ${nightVision ? 'bg-brand-night/10 border-brand-night text-brand-night shadow-[0_0_15px_rgba(0,255,65,0.1)]' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
              >
                <Eye className="w-3.5 h-3.5" />
                {nightVision ? 'Disable NVG' : 'Night Vision'}
              </button>
              <button 
                onClick={() => setIsDemoMode(!isDemoMode)}
                className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex flex-col items-center gap-2 ${isDemoMode ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}
              >
                <Zap className="w-3.5 h-3.5" />
                {isDemoMode ? 'Demo Active' : 'Demo Mode'}
              </button>
            </div>
            <button 
              onClick={exportReport}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-gray-400 hover:border-white/30 flex items-center justify-center gap-2 group transition-all"
            >
              <Database className="w-3.5 h-3.5 group-hover:text-emerald-500" />
              Generate Mission Report
            </button>
          </div>

          {/* Hackathon Pitch: Tech Stack */}
          <div className="bg-app-card border border-white/10 rounded-2xl p-4 shrink-0">
            <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${nightVision ? 'text-brand-night' : 'text-white'}`}>Stack Integrity</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'TF.js 4.0', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                { label: 'React 18', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { label: 'Tailwind V4', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                { label: 'Vite', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
              ].map((pill, i) => (
                <div key={i} className={`px-2 py-1 rounded text-[8px] font-bold border uppercase tracking-wider ${pill.color}`}>
                  {pill.label}
                </div>
              ))}
            </div>
          </div>
          {/* Mini Map Area */}
          <div className="h-48 bg-app-card border border-white/10 rounded-2xl p-1 relative overflow-hidden shrink-0">
            <div className="w-full h-full bg-[#1A1A1D] rounded-xl flex items-center justify-center relative overflow-hidden">
              {/* Visual Map Grid Lines */}
              <div className="absolute inset-0 opacity-10">
                 {Array.from({ length: 6 }).map((_, i) => (
                   <div key={`v-${i}`} className="absolute top-0 bottom-0 w-[1px] bg-gray-500" style={{ left: `${(i + 1) * 16.6}%` }} />
                 ))}
                 {Array.from({ length: 6 }).map((_, i) => (
                   <div key={`h-${i}`} className="absolute left-0 right-0 h-[1px] bg-gray-500" style={{ top: `${(i + 1) * 16.6}%` }} />
                 ))}
              </div>

              {/* Help Center Indicators */}
              {MOCK_HELP_CENTERS.map((center) => (
                <motion.div
                  key={center.id}
                  initial={false}
                  animate={{
                    scale: trackingId === center.id ? 1.5 : 1,
                    opacity: trackingId === center.id ? 1 : 0.6
                  }}
                  className="absolute"
                  style={{ left: `${center.location.x}%`, top: `${center.location.y}%` }}
                >
                  <div className={`w-2 h-2 rounded-full ${trackingId === center.id ? 'bg-brand-red shadow-[0_0_12px_#ef4444]' : 'bg-gray-500'}`} />
                  {trackingId === center.id && (
                    <motion.div 
                      layoutId="map-ring"
                      className="absolute -inset-2 border border-brand-red rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <span className={`absolute top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] uppercase font-bold tracking-tighter px-1 rounded ${trackingId === center.id ? 'bg-brand-red text-white' : 'bg-black/60 text-gray-500'}`}>
                    {center.name.split(' ')[0]}
                  </span>
                </motion.div>
              ))}
              
              <AnimatePresence>
                {isBuzzerActive && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10"
                  >
                    <div className="flex flex-col items-center gap-2">
                       <Radio className="w-6 h-6 text-brand-red animate-bounce" />
                       <span className="text-[8px] font-mono text-brand-red font-bold uppercase tracking-widest">Broadcasting_GPS</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute top-2 left-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
                <span className="text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold">Help Center Dispatch Map</span>
              </div>
            </div>
          </div>

          {/* Active Help Centers */}
          <section className="bg-app-card border border-white/10 rounded-2xl overflow-hidden shrink-0">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Nearby Response Units</span>
              </div>
              <LifeBuoy className="w-4 h-4 text-gray-600" />
            </div>
            <div className="p-2 max-h-48 overflow-y-auto">
              {MOCK_HELP_CENTERS.map((center) => (
                <button 
                  key={center.id} 
                  onClick={() => handleTrackCenter(center.id)}
                  className={`w-full text-left p-3 mb-1 rounded-lg group transition-all flex justify-between items-center border ${trackingId === center.id ? 'bg-white/[0.05] border-white/10' : 'border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${center.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-brand-red animate-pulse'}`} />
                    <div>
                      <div className="text-xs font-medium text-gray-200">{center.name}</div>
                      <div className="text-[9px] text-gray-500 font-mono italic">{center.distance} • {center.status.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className={`text-[9px] uppercase font-bold tracking-widest px-2 py-1 rounded transition-all ${trackingId === center.id ? 'bg-brand-red text-white' : 'opacity-0 group-hover:opacity-100 bg-white/10 text-gray-300'}`}>
                    {trackingId === center.id ? 'Tracking' : 'View'}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Activity Log */}
          <div className="flex-1 bg-app-card border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Event History</h3>
              <span className="text-[9px] text-gray-500 font-mono">SESSION: #8821</span>
            </div>
            
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                    <History className="w-8 h-8 mb-3" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em]">Awaiting Uplink</span>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-4 shrink-0"
                    >
                      <span className={`text-[10px] font-mono mt-1 shrink-0 ${nightVision ? 'text-brand-night' : 'text-brand-red'}`}>
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <div>
                        <p className={`text-sm font-medium leading-tight ${nightVision ? 'text-white' : 'text-gray-200'}`}>{alert.message.split('|')[0]}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{alert.message.split('|')[1] || 'Primary Sensor Triggered'}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Storage/Health Indicator */}
            <div className={`p-4 bg-white/[0.02] mt-auto rounded-b-2xl border-t border-white/5 shrink-0 ${nightVision ? 'text-brand-night' : ''}`}>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                <span className="text-gray-500">Storage Used</span>
                <span className={nightVision ? 'text-brand-night' : 'text-white'}>12.4 GB / 256 GB</span>
              </div>
              <div className="h-1 bg-white/10 mt-2 rounded-full overflow-hidden">
                <div className={`h-full opacity-60 w-[5%] rounded-full ${nightVision ? 'bg-brand-night shadow-[0_0_8px_#00FF41]' : 'bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.2)]'}`}></div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Info Bar */}
      <footer className="h-10 bg-black border-t border-white/5 px-8 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] shrink-0">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className={`text-[12px] ${nightVision ? 'text-brand-night animate-flicker' : 'text-emerald-500'}`}>●</span>
            <span className={nightVision ? 'text-brand-night' : 'text-emerald-500/80'}>T-Flow Core Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[12px] ${nightVision ? 'text-brand-night' : 'text-blue-500'}`}>●</span>
            <span className="text-gray-600">Model: MobileNet_v2</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-gray-500">
            <span className="text-gray-800">|</span>
            <span>Uptime: {elapsed}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-700">
          <span className={nightVision ? 'text-brand-night/40 group-hover:text-brand-night transition-colors' : ''}>Secure Observation Terminal v1.0.4</span>
          <span className="text-gray-800">|</span>
          <span className={`opacity-60 ${nightVision ? 'text-brand-night' : 'text-white'}`}>ID: GUEST_SENTINEL</span>
        </div>
      </footer>
    </div>
  );
}

