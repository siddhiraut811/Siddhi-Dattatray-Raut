/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Dashboard />
      
      {/* Advanced Image Processing SVG Filters */}
      <svg className="hidden">
        <defs>
          <filter id="night-vision-advanced">
            {/* 1. Adaptive Contrast - Normalize and boost greens */}
            <feColorMatrix type="matrix" values="
              0 0 0 0 0
              0.3 0.6 0.1 0 0
              0 0 0 0 0
              0 0 0 1 0" />
            
            {/* 2. Noise/Grain Injection */}
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="destat-noise" />
            
            {/* 3. Composite Noise for Gain look */}
            <feComposite in="SourceGraphic" in2="destat-noise" operator="arithmetic" k1="0.1" k2="0.9" result="grainy" />
            
            {/* 4. Adaptive Glow/Bloom (Simulates high-gain light blooming) */}
            <feGaussianBlur in="grainy" stdDeviation="1.5" result="blur" />
            <feComposite in="grainy" in2="blur" operator="arithmetic" k1="0.5" k2="0.5" />
          </filter>

          <filter id="thermal-noise">
            <feTurbulence type="turbulence" baseFrequency="0.01 0.1" numOctaves="1" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

