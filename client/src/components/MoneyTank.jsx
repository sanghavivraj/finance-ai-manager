import { motion } from 'framer-motion';
import { formatINR } from '../utils/currency.js';

export default function MoneyTank({ remaining, totalIncome }) {
  // Calculate percentage (clamp between 0 and 100 for visual, but keep actual for text)
  const percentage = Math.max(0, Math.min(100, (remaining / totalIncome) * 100));
  const isOverBudget = remaining < 0;

  // Determine liquid color based on percentage
  let liquidColor = '#10b981'; // Emerald Green (Safe)
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  
  if (percentage < 40) {
    liquidColor = '#ef4444'; // Red (Danger)
    glowColor = 'rgba(239, 68, 68, 0.4)';
  } else if (percentage < 75) {
    liquidColor = '#f59e0b'; // Amber/Yellow (Warning)
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }

  // Tank dimensions
  const tankHeight = 320;
  const tankWidth = 200;
  const liquidHeight = (tankHeight / 100) * percentage;
  const liquidY = tankHeight - liquidHeight;

  return (
    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <h3 className="text-lg font-bold text-slate-800 mb-2 z-10">Financial Tank</h3>
      <p className="text-sm text-slate-500 mb-6 z-10">Monthly Income Capacity</p>

      <div className="relative w-[240px] h-[360px]">
        <svg viewBox="0 0 240 360" className="w-full h-full drop-shadow-2xl">
          <defs>
            {/* Clip path to keep liquid inside the rounded bottle */}
            <clipPath id="tank-clip">
              <rect x="20" y="20" width={tankWidth} height={tankHeight} rx="24" />
            </clipPath>
            
            {/* Liquid Gradient */}
            <linearGradient id="liquid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={liquidColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={liquidColor} stopOpacity="1" />
            </linearGradient>

            {/* Glass Reflection Gradient */}
            <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* 1. The Liquid Group (Clipped to tank shape) */}
          <g clipPath="url(#tank-clip)">
            {/* Main Liquid Body */}
            <motion.rect
              x="20"
              initial={{ y: tankHeight + 20, height: 0 }}
              animate={{ y: 20 + liquidY, height: liquidHeight + 20 }}
              transition={{ type: "spring", stiffness: 50, damping: 20, duration: 1.5 }}
              fill="url(#liquid-grad)"
            />

            {/* The Wave at the top of the liquid */}
            {percentage > 0 && (
              <g>
                <motion.path
                  className="wave-path"
                  d={`M 0 ${20 + liquidY} 
                      Q 30 ${20 + liquidY - 8} 60 ${20 + liquidY} 
                      T 120 ${20 + liquidY} 
                      T 180 ${20 + liquidY} 
                      T 240 ${20 + liquidY} 
                      T 300 ${20 + liquidY} 
                      T 360 ${20 + liquidY}
                      T 420 ${20 + liquidY}
                      T 480 ${20 + liquidY}
                      L 480 400 L 0 400 Z`}
                  fill={liquidColor}
                  opacity="0.8"
                />
              </g>
            )}
          </g>

          {/* 2. The Glass Bottle Outline & Reflections */}
          <rect 
            x="20" y="20" width={tankWidth} height={tankHeight} rx="24" 
            fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="4" 
          />
          
          {/* Inner Glass Highlight */}
          <rect 
            x="24" y="24" width={tankWidth - 8} height={tankHeight - 8} rx="20" 
            fill="url(#glass-grad)" className="glass-shine"
          />

          {/* Left Edge Reflection */}
          <path 
            d="M 30 40 Q 30 180 30 320" 
            stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5" 
          />
        </svg>

        {/* 3. Text Overlay (Centered in the bottle) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <motion.div
            key={remaining}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="text-3xl font-black text-white drop-shadow-md tracking-tight">
              {formatINR(Math.max(0, remaining))}
            </div>
            <div className="text-sm font-medium text-white/90 drop-shadow-sm mt-1">
              {isOverBudget ? 'Over Budget!' : `${percentage.toFixed(0)}% Remaining`}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="flex justify-between w-full mt-4 px-4 text-xs font-medium text-slate-500">
        <span>Spent: {formatINR(totalIncome - remaining)}</span>
        <span>Total: {formatINR(totalIncome)}</span>
      </div>
    </div>
  );
}