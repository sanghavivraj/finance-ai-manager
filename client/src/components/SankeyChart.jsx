// import { useState } from 'react';
// import { motion } from 'framer-motion';

// export default function SankeyChart({ data, onCategoryClick }) {
//   const [hoveredFlow, setHoveredFlow] = useState(null);

//   if (!data || !data.flows || data.flows.length === 0) {
//     return (
//       <div className="glass-card p-6">
//         <h3 className="text-xl font-bold text-slate-800 mb-2">Money Flow</h3>
//         <p className="text-sm text-slate-500 mb-4">Where your money comes from & goes</p>
//         <div className="text-center text-slate-400 py-12">
//           No data available. Add income and budgets to see the flow.
//         </div>
//       </div>
//     );
//   }

//   const { sources, targets, flows, total } = data;
  
//   const width = 1000;
//   const boxHeight = 70;
//   const boxGap = 35;
//   const topPadding = 80;
//   const nameSpace = 25;
//   const bottomPadding = 50;
  
//   const totalHeight = topPadding + (targets.length * (boxHeight + boxGap)) + bottomPadding;
  
//   const sourceWidth = 140;
//   const targetWidth = 160;
//   const sourceX = 150;
//   const targetX = width - targetWidth - 150;

//   const sourceHeight = (targets.length * boxHeight) + ((targets.length - 1) * boxGap);
//   const sourceNode = {
//     ...sources[0],
//     x: sourceX,
//     y: topPadding,
//     height: sourceHeight,
//   };

//   // OPTION 1: MODERN FINTECH - Distinct pastel colors for each category
//   const categoryColors = {
//     'Food': { box: '#fb7185', flow: '#fecdd3' },        // Soft Rose
//     'Shopping': { box: '#fbbf24', flow: '#fde68a' },    // Soft Amber
//     'Transport': { box: '#38bdf8', flow: '#bae6fd' },   // Soft Sky Blue
//     'Bills': { box: '#94a3b8', flow: '#cbd5e1' },       // Soft Slate
//     'Entertainment': { box: '#c084fc', flow: '#e9d5ff' }, // Soft Violet
//     'Savings': { box: '#34d399', flow: '#a7f3d0' },     // Soft Emerald
//     'Investments': { box: '#818cf8', flow: '#c7d2fe' }, // Soft Indigo
//   };

//   const targetNodes = targets.map((target, i) => {
//     const colors = categoryColors[target.name] || categoryColors['Food'];
//     return {
//       ...target,
//       x: targetX,
//       y: topPadding + i * (boxHeight + boxGap) + nameSpace,
//       height: boxHeight,
//       color: colors.box,
//       flowColor: colors.flow,
//     };
//   });

//   const sourceCenterY = sourceNode.y + sourceNode.height / 2;
//   const sourceStartX = sourceNode.x + sourceWidth;

//   const flowsWithPositions = flows.map((flow) => {
//     const target = targetNodes.find(t => t.name === flow.target);
//     if (!target) return null;
    
//     const ribbonThickness = (flow.value / total) * sourceHeight * 0.3;
    
//     return {
//       ...flow,
//       sourceY: sourceCenterY - ribbonThickness / 2,
//       sourceHeight: ribbonThickness,
//       targetY: target.y,
//       targetHeight: boxHeight,
//       color: target.color,
//       flowColor: target.flowColor,
//     };
//   }).filter(Boolean);

//   const generateRibbonPath = (flow) => {
//     const startX = sourceStartX;
//     const endX = targetX;
//     const midX = (startX + endX) / 2;
    
//     const sy = flow.sourceY;
//     const sh = flow.sourceHeight;
//     const ty = flow.targetY;
//     const th = flow.targetHeight;
    
//     return `
//       M ${startX} ${sy}
//       C ${startX + 100} ${sy}, ${midX} ${ty}, ${endX} ${ty}
//       L ${endX} ${ty + th}
//       C ${midX} ${ty + th}, ${startX + 100} ${sy + sh}, ${startX} ${sy + sh}
//       Z
//     `;
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="glass-card p-6"
//     >
//       <h3 className="text-xl font-bold text-slate-800 mb-1">Money Flow</h3>
//       <p className="text-sm text-slate-500 mb-6">Where your money comes from & goes</p>
      
//       <div className="w-full">
//         <svg 
//           viewBox={`0 0 ${width} ${totalHeight}`} 
//           className="w-full h-auto"
//           preserveAspectRatio="xMidYMid meet"
//         >
//           <defs>
//             {flowsWithPositions.map((flow, i) => (
//               <linearGradient key={`grad-${i}`} id={`flowGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
//                 <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
//                 <stop offset="100%" stopColor={flow.flowColor} stopOpacity="0.7" />
//               </linearGradient>
//             ))}
            
//             <filter id="glow">
//               <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
//               <feMerge>
//                 <feMergeNode in="coloredBlur"/>
//                 <feMergeNode in="SourceGraphic"/>
//               </feMerge>
//             </filter>
//           </defs>

//           {flowsWithPositions.map((flow, i) => {
//             const isHovered = hoveredFlow === i;
//             const isDimmed = hoveredFlow !== null && hoveredFlow !== i;
            
//             return (
//               <g key={`flow-${i}`}>
//                 <path
//                   d={generateRibbonPath(flow)}
//                   fill={`url(#flowGrad-${i})`}
//                   opacity={isDimmed ? 0.15 : isHovered ? 1 : 0.6}
//                   filter={isHovered ? "url(#glow)" : "none"}
//                   className="transition-all duration-300 cursor-pointer"
//                   onMouseEnter={() => setHoveredFlow(i)}
//                   onMouseLeave={() => setHoveredFlow(null)}
//                   onClick={() => {
//                     const target = targetNodes.find(t => t.name === flow.target);
//                     if (target && onCategoryClick) {
//                       onCategoryClick(target);
//                     }
//                   }}
//                 >
//                   <title>{`${flow.source} → ${flow.target}: ₹${flow.value.toLocaleString()}`}</title>
//                 </path>
//               </g>
//             );
//           })}

//           <g>
//             <rect
//               x={sourceNode.x}
//               y={sourceNode.y}
//               width={sourceWidth}
//               height={sourceNode.height}
//               fill="#10b981"
//               rx="12"
//               opacity="0.8"
//             />
//             <text
//               x={sourceNode.x + sourceWidth / 2}
//               y={sourceNode.y - 30}
//               fill="#1e293b"
//               fontSize="18"
//               fontWeight="bold"
//               textAnchor="middle"
//             >
//               {sources[0].name}
//             </text>
//             <text
//               x={sourceNode.x + sourceWidth / 2}
//               y={sourceNode.y + sourceNode.height / 2 - 10}
//               fill="white"
//               fontSize="24"
//               fontWeight="bold"
//               textAnchor="middle"
//             >
//               ₹{sources[0].value.toLocaleString()}
//             </text>
//             <text
//               x={sourceNode.x + sourceWidth / 2}
//               y={sourceNode.y + sourceNode.height / 2 + 15}
//               fill="white"
//               fontSize="14"
//               textAnchor="middle"
//               opacity="0.9"
//             >
//               100%
//             </text>
//           </g>

//           {targetNodes.map((target, i) => (
//             <g 
//               key={`target-${i}`}
//               onClick={() => onCategoryClick && onCategoryClick(target)}
//               className="cursor-pointer"
//             >
//               <text
//                 x={target.x + targetWidth / 2}
//                 y={target.y - 12}
//                 fill="#334155"
//                 fontSize="14"
//                 fontWeight="600"
//                 textAnchor="middle"
//               >
//                 {target.name}
//               </text>
              
//               <rect
//                 x={target.x}
//                 y={target.y}
//                 width={targetWidth}
//                 height={target.height}
//                 fill={target.color}
//                 rx="12"
//                 className="hover:opacity-90 transition-opacity"
//               />
              
//               <text
//                 x={target.x + targetWidth / 2}
//                 y={target.y + target.height / 2 - 5}
//                 fill="white"
//                 fontSize="18"
//                 fontWeight="bold"
//                 textAnchor="middle"
//               >
//                 ₹{target.value.toLocaleString()}
//               </text>
              
//               <text
//                 x={target.x + targetWidth / 2}
//                 y={target.y + target.height / 2 + 18}
//                 fill="white"
//                 fontSize="13"
//                 textAnchor="middle"
//                 opacity="0.95"
//               >
//                 {((target.value / total) * 100).toFixed(0)}%
//               </text>
//             </g>
//           ))}
//         </svg>
//       </div>
//     </motion.div>
//   );
// }
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '../utils/currency.js';
import { Filter, ArrowRight, Wallet, Droplets } from 'lucide-react';

const categoryIcons = {
  'Food': '🍔',
  'Shopping': '🛍️',
  'Transport': '🚗',
  'Bills': '📄',
  'Entertainment': '🎮',
  'Savings': '💰',
  'Investments': '📈',
};

const categoryColors = {
  'Food': { node: 'from-rose-500 to-pink-600', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', flow: '#f43f5e' },
  'Shopping': { node: 'from-amber-500 to-yellow-600', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', flow: '#f59e0b' },
  'Transport': { node: 'from-sky-500 to-blue-600', text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', flow: '#0284c7' },
  'Bills': { node: 'from-purple-500 to-indigo-600', text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', flow: '#8b5cf6' },
  'Entertainment': { node: 'from-fuchsia-500 to-pink-600', text: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', flow: '#d946ef' },
  'Savings': { node: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', flow: '#10b981' },
  'Investments': { node: 'from-indigo-500 to-cyan-600', text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', flow: '#6366f1' },
};

const defaultColor = { node: 'from-slate-500 to-slate-700', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', flow: '#64748b' };

export default function SankeyChart({ data, onCategoryClick }) {
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || !data.flows || data.flows.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-400">
        <Wallet className="mx-auto mb-2 opacity-50" size={36} />
        <p className="text-sm font-medium">No flow data available yet. Add income and expenses to visualize money flow.</p>
      </div>
    );
  }

  const { total: totalIncome, flows } = data;

  // Filter flows
  const displayFlows = showActiveOnly 
    ? flows.filter(f => parseFloat(f.value) > 0)
    : flows;

  const activeFlows = displayFlows.length > 0 ? displayFlows : flows;
  const sortedFlows = [...activeFlows].sort((a, b) => b.value - a.value);

  // Calculate totals
  const totalSpent = flows.reduce((sum, f) => sum + parseFloat(f.value || 0), 0);
  const unallocated = Math.max(0, totalIncome - totalSpent);
  const remainingPercent = totalIncome > 0 ? Math.max(0, Math.min(100, ((totalIncome - totalSpent) / totalIncome) * 100)) : 0;

  // Dynamic Liquid Bottle Colors
  let liquidColor = '#10b981'; // Emerald (safe)
  if (remainingPercent < 25) liquidColor = '#ef4444'; // Red (danger)
  else if (remainingPercent < 60) liquidColor = '#f59e0b'; // Amber (warning)

  // Layout geometry dimensions
  const svgWidth = 920;
  const nodeHeight = 60;
  const nodeGap = 18;
  const topPadding = 65;
  const bottomPadding = 45;

  const targetCount = sortedFlows.length + (unallocated > 0 && showActiveOnly ? 1 : 0);
  const totalContentHeight = Math.max(360, targetCount * (nodeHeight + nodeGap));
  const svgHeight = topPadding + totalContentHeight + bottomPadding;

  // Widened income bottle dimensions (125px width for spacious text!)
  const sourceX = 40;
  const sourceWidth = 125; // Widened from 95px to 125px!
  const sourceY = topPadding;
  const sourceHeight = totalContentHeight;

  const targetX = 690;
  const targetWidth = 180;
  const midX = (sourceX + sourceWidth + targetX) / 2;

  // Include unallocated in flow list if positive
  const flowsWithUnallocated = [...sortedFlows];
  if (unallocated > 0 && showActiveOnly) {
    flowsWithUnallocated.push({
      source: 'Income',
      target: 'Unallocated / Savings',
      value: unallocated,
      isUnallocated: true,
    });
  }

  // Target node Y positions
  const targetNodes = flowsWithUnallocated.map((flow, i) => {
    const y = topPadding + i * (nodeHeight + nodeGap);
    const colorObj = flow.isUnallocated 
      ? { node: 'from-teal-500 to-emerald-600', text: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', flow: '#14b8a6', icon: '💰' }
      : (categoryColors[flow.target] || defaultColor);

    return {
      ...flow,
      y,
      height: nodeHeight,
      colorObj,
      icon: flow.isUnallocated ? '💰' : (categoryIcons[flow.target] || '📦'),
    };
  });

  // Calculate flow ribbons on left (Income side)
  const effectiveTotal = Math.max(totalIncome, totalSpent);
  let currentSourceY = sourceY;

  const ribbons = targetNodes.map((targetNode, i) => {
    const proportion = effectiveTotal > 0 ? targetNode.value / effectiveTotal : 1 / targetNodes.length;
    const ribbonHeight = Math.max(12, proportion * (sourceHeight - (targetNodes.length - 1) * 4));
    
    const sy1 = currentSourceY;
    const sy2 = currentSourceY + ribbonHeight;
    currentSourceY += ribbonHeight + 4;

    const ty1 = targetNode.y + 6;
    const ty2 = targetNode.y + nodeHeight - 6;

    const path = `
      M ${sourceX + sourceWidth} ${sy1}
      C ${midX} ${sy1}, ${midX} ${ty1}, ${targetX} ${ty1}
      L ${targetX} ${ty2}
      C ${midX} ${ty2}, ${midX} ${sy2}, ${sourceX + sourceWidth} ${sy2}
      Z
    `;

    return {
      id: i,
      targetName: targetNode.target,
      value: targetNode.value,
      path,
      color: targetNode.colorObj.flow,
      sy1,
      sy2,
      ty1,
      ty2,
    };
  });

  // Bottle liquid height calculation
  const liquidHeight = (sourceHeight * remainingPercent) / 100;
  const liquidY = sourceY + (sourceHeight - liquidHeight);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Droplets size={14} className="text-emerald-600 animate-bounce" />
            Income Level: {remainingPercent.toFixed(0)}% ({formatINR(totalIncome - totalSpent)} left)
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
            Spent: {formatINR(totalSpent)}
          </span>
        </div>

        <button
          onClick={() => setShowActiveOnly(!showActiveOnly)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
            showActiveOnly 
              ? 'bg-primary-50 text-primary-600 border border-primary-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Filter size={14} />
          {showActiveOnly ? 'Showing Active Flows' : 'Showing All Categories'}
        </button>
      </div>

      {/* Interactive Flow Canvas */}
      <div className="relative w-full overflow-x-auto rounded-2xl bg-gradient-to-b from-slate-50/50 to-white/80 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[780px] h-auto drop-shadow-sm select-none"
        >
          <defs>
            {/* Ribbon Gradients */}
            {ribbons.map((r) => (
              <linearGradient key={`grad-${r.id}`} id={`sankey-grad-${r.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={liquidColor} stopOpacity="0.45" />
                <stop offset="50%" stopColor={r.color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={r.color} stopOpacity="0.75" />
              </linearGradient>
            ))}

            {/* Income Bottle Clip Path */}
            <clipPath id="income-bottle-clip">
              <rect x={sourceX} y={sourceY} width={sourceWidth} height={sourceHeight} rx={22} />
            </clipPath>

            {/* Income Liquid Fill Gradient */}
            <linearGradient id="income-liquid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={liquidColor} stopOpacity="0.85" />
              <stop offset="100%" stopColor={liquidColor} stopOpacity="1" />
            </linearGradient>

            <filter id="ribbonGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Flow Ribbons */}
          <g>
            {ribbons.map((r) => {
              const isHovered = hoveredIdx === r.id;
              const isDimmed = hoveredIdx !== null && hoveredIdx !== r.id;

              return (
                <motion.path
                  key={`ribbon-${r.id}`}
                  d={r.path}
                  fill={`url(#sankey-grad-${r.id})`}
                  opacity={isDimmed ? 0.12 : isHovered ? 0.95 : 0.65}
                  filter={isHovered ? 'url(#ribbonGlow)' : 'none'}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(r.id)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => {
                    if (!r.isUnallocated && onCategoryClick) {
                      onCategoryClick({ name: r.targetName });
                    }
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDimmed ? 0.12 : isHovered ? 0.95 : 0.65 }}
                  transition={{ duration: 0.4 }}
                >
                  <title>{`${data.sources?.[0]?.name || 'Income'} → ${r.targetName}: ${formatINR(r.value)}`}</title>
                </motion.path>
              );
            })}
          </g>

          {/* --- WIDENED INCOME BOTTLE WITH DYNAMIC WATER LEVEL --- */}
          <g>
            {/* Header label above bottle */}
            <text
              x={sourceX + sourceWidth / 2}
              y={sourceY - 22}
              textAnchor="middle"
              className="fill-slate-700 font-bold text-sm tracking-wide"
            >
              💰 Total Income
            </text>

            {/* Bottle Glass Background Vessel */}
            <rect
              x={sourceX}
              y={sourceY}
              width={sourceWidth}
              height={sourceHeight}
              rx={22}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />

            {/* Clipped Liquid Fill inside Bottle */}
            <g clipPath="url(#income-bottle-clip)">
              {/* Liquid Rect */}
              <motion.rect
                x={sourceX}
                initial={{ y: sourceY + sourceHeight, height: 0 }}
                animate={{ y: liquidY, height: liquidHeight }}
                transition={{ type: "spring", stiffness: 45, damping: 18 }}
                width={sourceWidth}
                fill="url(#income-liquid-grad)"
              />

              {/* Animated Wave Top */}
              {remainingPercent > 0 && (
                <motion.path
                  d={`M ${sourceX} ${liquidY}
                      Q ${sourceX + 30} ${liquidY - 5} ${sourceX + 60} ${liquidY}
                      T ${sourceX + 125} ${liquidY}
                      L ${sourceX + 125} ${sourceY + sourceHeight}
                      L ${sourceX} ${sourceY + sourceHeight} Z`}
                  fill={liquidColor}
                  opacity="0.8"
                />
              )}
            </g>

            {/* Glass Bottle Highlight Lines */}
            <rect
              x={sourceX}
              y={sourceY}
              width={sourceWidth}
              height={sourceHeight}
              rx={22}
              fill="none"
              stroke="white"
              strokeWidth="2"
              opacity="0.6"
            />
            <line
              x1={sourceX + 10}
              y1={sourceY + 16}
              x2={sourceX + 10}
              y2={sourceY + sourceHeight - 16}
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.5"
            />

            {/* Spacious Bottle Text Display */}
            <text
              x={sourceX + sourceWidth / 2}
              y={sourceY + sourceHeight / 2 - 8}
              textAnchor="middle"
              fill={remainingPercent > 50 ? 'white' : '#1e293b'}
              className="font-extrabold text-base tracking-tight drop-shadow-sm"
            >
              {formatINR(totalIncome)}
            </text>
            <text
              x={sourceX + sourceWidth / 2}
              y={sourceY + sourceHeight / 2 + 14}
              textAnchor="middle"
              fill={remainingPercent > 50 ? 'rgba(255,255,255,0.9)' : '#64748b'}
              className="font-extrabold text-xs"
            >
              {remainingPercent.toFixed(0)}% Level
            </text>
          </g>

          {/* Target Nodes (Category Cards) */}
          <g>
            <text
              x={targetX + targetWidth / 2}
              y={topPadding - 22}
              textAnchor="middle"
              className="fill-slate-700 font-bold text-sm tracking-wide"
            >
              Expense Categories
            </text>

            {targetNodes.map((target, i) => {
              const isHovered = hoveredIdx === i;
              const percent = totalIncome > 0 ? ((target.value / totalIncome) * 100).toFixed(0) : '0';

              return (
                <g
                  key={`target-group-${i}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => {
                    if (!target.isUnallocated && onCategoryClick) {
                      onCategoryClick({ name: target.target });
                    }
                  }}
                >
                  <rect
                    x={targetX}
                    y={target.y}
                    width={targetWidth}
                    height={target.height}
                    rx={14}
                    fill={isHovered ? target.colorObj.flow : '#ffffff'}
                    stroke={target.colorObj.flow}
                    strokeWidth={isHovered ? 2 : 1.5}
                    className="transition-all duration-300 shadow-sm"
                    style={{
                      filter: isHovered 
                        ? `drop-shadow(0 6px 16px ${target.colorObj.flow}40)` 
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.03))'
                    }}
                  />

                  <text
                    x={targetX + 14}
                    y={target.y + 22}
                    textAnchor="start"
                    fill={isHovered ? '#ffffff' : '#1e293b'}
                    className="font-bold text-xs"
                  >
                    {target.icon} {target.target}
                  </text>

                  <text
                    x={targetX + 14}
                    y={target.y + 45}
                    textAnchor="start"
                    fill={isHovered ? '#ffffff' : '#334155'}
                    className="font-bold text-xs"
                  >
                    {formatINR(target.value)}
                  </text>

                  <text
                    x={targetX + targetWidth - 14}
                    y={target.y + 45}
                    textAnchor="end"
                    fill={isHovered ? 'rgba(255,255,255,0.9)' : target.colorObj.flow}
                    className="font-extrabold text-[11px]"
                  >
                    {percent}%
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Dynamic Tooltip on Hover */}
        <AnimatePresence>
          {hoveredIdx !== null && ribbons[hoveredIdx] && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white rounded-xl text-xs font-medium shadow-xl flex items-center gap-3 z-20 pointer-events-none"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Income Tank</span>
              </div>
              <ArrowRight size={14} className="text-slate-400" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-emerald-300">{ribbons[hoveredIdx].targetName}</span>
                <span>:</span>
                <span className="font-bold text-white">{formatINR(ribbons[hoveredIdx].value)}</span>
                <span className="text-slate-400">
                  ({totalIncome > 0 ? ((ribbons[hoveredIdx].value / totalIncome) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}