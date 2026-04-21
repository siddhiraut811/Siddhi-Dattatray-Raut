/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Camera, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { loadModel, detectVehicles } from '../lib/detection';
import { motion, AnimatePresence } from 'motion/react';
import type { Alert } from '../types';

interface DetectorProps {
  onAlert: (alert: Alert) => void;
  isBuzzerActive: boolean;
  nightVision: boolean;
  onStatsUpdate: (count: number, avgSpeed: number) => void;
  isDemoMode?: boolean;
}

export default function Detector({ onAlert, isBuzzerActive, nightVision, onStatsUpdate, isDemoMode = false }: DetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing System...');
  const lastAlertTime = useRef<number>(0);
  const demoVehicles = useRef<any[]>([]);
  
  // Stats tracking
// ... existing stats tracking ...
  const vehicleCount = useRef<number>(0);
  const speedSamples = useRef<number[]>([]);
  
  // Track state for speed estimation
  const previousTracks = useRef<{ [id: string]: { center: { x: number; y: number }, timestamp: number, speed: number } }>({});
  const trackIds = useRef<string[]>([]);

  useEffect(() => {
    async function setupSystem() {
      try {
        setDebugInfo('Calibrating Sensors...');
        await loadModel();
        setIsModelLoading(false);
        setDebugInfo('Sensors Online. Accessing Feed...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: 640, height: 480 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsDetecting(true);
        setDebugInfo('Active Monitoring Enabled.');
      } catch (error) {
        console.error('Setup error:', error);
        setDebugInfo('CRITICAL ERROR: SENSOR ACCESS DENIED');
      }
    }

    setupSystem();
    
    return () => {
      // Cleanup stream if needed
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    
    const runDetection = async () => {
      if (videoRef.current && isDetecting && !isModelLoading && videoRef.current.videoWidth > 0) {
        let rawPredictions = await detectVehicles(videoRef.current);
        
        // --- HACKATHON DEMO MODE: INJECT SIMULATED VEHICLES ---
        if (isDemoMode) {
          // Increase likelihood of appearance if no vehicles found
          if (rawPredictions.length === 0 && Math.random() > 0.98 && demoVehicles.current.length < 2) {
             demoVehicles.current.push({
               id: `demo_${Date.now()}`,
               x: -50,
               y: 150 + Math.random() * 100,
               w: 120,
               h: 80,
               speed: 40 + Math.random() * 40
             });
          }

          // Move demo vehicles and convert to prediction format
          demoVehicles.current = demoVehicles.current.filter(dv => {
            dv.x += dv.speed * 0.1; // Speed x time
            return dv.x < 700;
          });

          const demoPredictions = demoVehicles.current.map(dv => ({
            bbox: [dv.x, dv.y, dv.w, dv.h],
            class: 'car' as const,
            score: 0.99
          }));

          rawPredictions = [...rawPredictions, ...demoPredictions];
        }
        // -----------------------------------------------------

        const now = Date.now();
        const currentTracks: { [id: string]: { center: { x: number; y: number }, timestamp: number, speed: number } } = {};
        const ppsToKmh = 1.2; // Conversion factor: pixels per second to KMH (heuristic)

        const predictions = rawPredictions.map((p, idx) => {
          const [x, y, width, height] = p.bbox;
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          // Simple centroid matching
          let matchedId = null;
          Object.keys(previousTracks.current).forEach(id => {
            const prev = previousTracks.current[id];
            const dist = Math.sqrt(Math.pow(prev.center.x - centerX, 2) + Math.pow(prev.center.y - centerY, 2));
            if (dist < 100) matchedId = id;
          });

          const currentId = matchedId || `v_${now}_${idx}`;
          let estimatedSpeed = 0;

          if (matchedId) {
            const prev = previousTracks.current[matchedId];
            const distPixels = Math.sqrt(Math.pow(prev.center.x - centerX, 2) + Math.pow(prev.center.y - centerY, 2));
            const timeDiff = (now - prev.timestamp) / 1000;
            if (timeDiff > 0) {
              estimatedSpeed = (distPixels / timeDiff) * ppsToKmh;
              estimatedSpeed = (prev.speed * 0.8) + (estimatedSpeed * 0.2); // Smooth noise
            }
          }

          currentTracks[currentId] = {
            center: { x: centerX, y: centerY },
            timestamp: now,
            speed: estimatedSpeed
          };

          return { ...p, speed: estimatedSpeed };
        });

        previousTracks.current = currentTracks;
        
        // Update Stats
        if (predictions.length > 0) {
          predictions.forEach(p => {
            if (p.speed > 5) speedSamples.current.push(p.speed);
          });
          
          if (speedSamples.current.length > 50) speedSamples.current.shift();
          const avg = speedSamples.current.length > 0 
            ? speedSamples.current.reduce((a, b) => a + b, 0) / speedSamples.current.length 
            : 0;
          
          onStatsUpdate(vehicleCount.current, avg);
        }

        // Handle Alerts
        if (predictions.length > 0) {
          if (now - lastAlertTime.current > 3000) { // 3-second cooldown
            vehicleCount.current += predictions.length;
            const primary = predictions[0];
            onAlert({
              id: Math.random().toString(36).substr(2, 9),
              timestamp: now,
              type: 'vehicle_detected',
              message: `INCOMING VEHICLE: ${primary.class.toUpperCase()} | VELOCITY: ${primary.speed.toFixed(1)} KM/H | THREAT: ${primary.speed > 50 ? 'LEVEL 4' : 'LEVEL 1'}`,
              severity: primary.speed > 50 ? 'high' : 'medium'
            });
            lastAlertTime.current = now;
          }
        }

        // Draw Bounding Boxes
        if (canvasRef.current && videoRef.current) {
          // Sync dimensions
          if (canvasRef.current.width !== videoRef.current.videoWidth || canvasRef.current.height !== videoRef.current.videoHeight) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }

          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.strokeStyle = '#FFD029';
            ctx.lineWidth = 2;
            ctx.font = 'bold 10px Inter';

            predictions.forEach(p => {
              const [x, y, width, height] = p.bbox;
              ctx.strokeRect(x, y, width, height);
              
              const label = `${p.class.toUpperCase()} ${p.speed.toFixed(0)} KM/H`;
              const textWidth = ctx.measureText(label).width;
              ctx.fillStyle = '#FFD029';
              ctx.fillRect(x, y > 20 ? y - 20 : 0, textWidth + 10, 18);
              
              ctx.fillStyle = '#000000';
              ctx.fillText(label, x + 5, y > 20 ? y - 7 : 13);
            });
          }
        }
      }
      animationFrameId = requestAnimationFrame(runDetection);
    };

    if (isDetecting) {
      runDetection();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isDetecting, isModelLoading, onAlert]);

  return (
    <div className="relative group flex-1 flex flex-col h-full">
      {/* Viewport Frame */}
      <div className={`relative flex-1 bg-app-card border border-white/10 rounded-2xl overflow-hidden transition-colors duration-300`}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-all duration-700 ${nightVision ? 'opacity-90' : 'opacity-60 grayscale'}`}
          style={nightVision ? { filter: 'url(#night-vision-advanced)' } : {}}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className={`absolute inset-0 w-full h-full pointer-events-none z-30 ${nightVision ? 'brightness-125 contrast-125 saturate-0' : ''}`}
        />
        
        {/* Detection Overlay Gradients */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 ${nightVision ? 'mix-blend-overlay opacity-30 shadow-[inset_0_0_100px_rgba(0,255,65,0.1)]' : ''}`}></div>
        <div className={`absolute inset-0 z-15 ${nightVision ? 'nv-overlay' : ''}`}>
           {/* Scan line */}
           <div className="w-full h-px bg-brand-night/20 shadow-[0_0_15px_#00FF41] animate-scanline" />
        </div>
        <div className={`absolute inset-0 opacity-10 pointer-events-none z-10 ${nightVision ? 'text-brand-night' : 'text-white'}`} style={{ backgroundImage: `radial-gradient(${nightVision ? '#00FF41' : '#ffffff'} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />

        {/* HUD Elements */}
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded text-[10px] uppercase font-bold text-gray-300 flex items-center gap-2">
            <Camera className={`w-3 h-3 ${nightVision ? 'text-brand-night animate-flicker' : 'text-white/50'}`} />
            <span className={nightVision ? 'text-brand-night' : ''}>Cam_01: Perimeter_East</span>
          </div>
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-2">
            <Activity className={`w-3 h-3 ${isDetecting ? 'animate-pulse' : ''} ${nightVision ? 'text-brand-night' : ''}`} />
            <span className={nightVision ? 'text-brand-night' : ''}>Sensor: {nightVision ? 'Thermal/IR' : 'Visible Light'}</span>
          </div>
        </div>

        {/* Alert Trigger Visual - Only shown when active */}
        <AnimatePresence>
          {isBuzzerActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-8 left-8 right-8 z-40 is-alerting p-4 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-red rounded-lg flex items-center justify-center text-black">
                  <AlertTriangle className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight uppercase">Critical Alert: Proximity Warning</h2>
                  <p className="text-red-200 text-xs opacity-80 uppercase tracking-wider">Buzzer Activated • Dispatching Coordinates...</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-xs text-gray-400 block uppercase">Threat Level</span>
                <span className="text-xl font-mono text-white tracking-widest">LEVEL 4</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* System Message Overlay */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-1">
           <div className={`font-mono text-[9px] text-gray-500 bg-black/40 px-2 py-1 rounded ${nightVision ? 'text-brand-night animate-flicker' : ''}`}>
             {debugInfo}
           </div>
           <div className={`font-mono text-[9px] text-gray-600 uppercase tracking-widest ${nightVision ? 'text-brand-night/60' : ''}`}>
             Status: {isModelLoading ? 'Syncing...' : 'Scanning'}
           </div>
        </div>
      </div>

      {/* Startup Overlay */}
      {isModelLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A0A0B] backdrop-blur-sm rounded-2xl">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-white/10 border-t-brand-yellow rounded-full animate-spin mx-auto mb-6" />
            <div className="font-mono text-[10px] text-gray-400 uppercase tracking-[0.4em] animate-pulse">Initializing Primary Core</div>
          </div>
        </div>
      )}
    </div>
  );
}

