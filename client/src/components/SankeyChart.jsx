import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SankeyChart({ data, onCategoryClick }) {
  const [hoveredFlow, setHoveredFlow] = useState(null);

  if (!data || !data.flows || data.flows.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Money Flow</h3>
        <p className="text-sm text-slate-500 mb-4">Where your money comes from & goes</p>
        <div className="text-center text-slate-400 py-12">
          No data available. Add income and budgets to see the flow.
        </div>
      </div>
    );
  }

  const { sources, targets, flows, total } = data;
  
  const width = 1000;
  const boxHeight = 70;
  const boxGap = 35;
  const topPadding = 80;
  const nameSpace = 25;
  const bottomPadding = 50;
  
  const totalHeight = topPadding + (targets.length * (boxHeight + boxGap)) + bottomPadding;
  
  const sourceWidth = 140;
  const targetWidth = 160;
  const sourceX = 150;
  const targetX = width - targetWidth - 150;

  const sourceHeight = (targets.length * boxHeight) + ((targets.length - 1) * boxGap);
  const sourceNode = {
    ...sources[0],
    x: sourceX,
    y: topPadding,
    height: sourceHeight,
  };

  // OPTION 1: MODERN FINTECH - Distinct pastel colors for each category
  const categoryColors = {
    'Food': { box: '#fb7185', flow: '#fecdd3' },        // Soft Rose
    'Shopping': { box: '#fbbf24', flow: '#fde68a' },    // Soft Amber
    'Transport': { box: '#38bdf8', flow: '#bae6fd' },   // Soft Sky Blue
    'Bills': { box: '#94a3b8', flow: '#cbd5e1' },       // Soft Slate
    'Entertainment': { box: '#c084fc', flow: '#e9d5ff' }, // Soft Violet
    'Savings': { box: '#34d399', flow: '#a7f3d0' },     // Soft Emerald
    'Investments': { box: '#818cf8', flow: '#c7d2fe' }, // Soft Indigo
  };

  const targetNodes = targets.map((target, i) => {
    const colors = categoryColors[target.name] || categoryColors['Food'];
    return {
      ...target,
      x: targetX,
      y: topPadding + i * (boxHeight + boxGap) + nameSpace,
      height: boxHeight,
      color: colors.box,
      flowColor: colors.flow,
    };
  });

  const sourceCenterY = sourceNode.y + sourceNode.height / 2;
  const sourceStartX = sourceNode.x + sourceWidth;

  const flowsWithPositions = flows.map((flow) => {
    const target = targetNodes.find(t => t.name === flow.target);
    if (!target) return null;
    
    const ribbonThickness = (flow.value / total) * sourceHeight * 0.3;
    
    return {
      ...flow,
      sourceY: sourceCenterY - ribbonThickness / 2,
      sourceHeight: ribbonThickness,
      targetY: target.y,
      targetHeight: boxHeight,
      color: target.color,
      flowColor: target.flowColor,
    };
  }).filter(Boolean);

  const generateRibbonPath = (flow) => {
    const startX = sourceStartX;
    const endX = targetX;
    const midX = (startX + endX) / 2;
    
    const sy = flow.sourceY;
    const sh = flow.sourceHeight;
    const ty = flow.targetY;
    const th = flow.targetHeight;
    
    return `
      M ${startX} ${sy}
      C ${startX + 100} ${sy}, ${midX} ${ty}, ${endX} ${ty}
      L ${endX} ${ty + th}
      C ${midX} ${ty + th}, ${startX + 100} ${sy + sh}, ${startX} ${sy + sh}
      Z
    `;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h3 className="text-xl font-bold text-slate-800 mb-1">Money Flow</h3>
      <p className="text-sm text-slate-500 mb-6">Where your money comes from & goes</p>
      
      <div className="w-full">
        <svg 
          viewBox={`0 0 ${width} ${totalHeight}`} 
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {flowsWithPositions.map((flow, i) => (
              <linearGradient key={`grad-${i}`} id={`flowGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor={flow.flowColor} stopOpacity="0.7" />
              </linearGradient>
            ))}
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {flowsWithPositions.map((flow, i) => {
            const isHovered = hoveredFlow === i;
            const isDimmed = hoveredFlow !== null && hoveredFlow !== i;
            
            return (
              <g key={`flow-${i}`}>
                <path
                  d={generateRibbonPath(flow)}
                  fill={`url(#flowGrad-${i})`}
                  opacity={isDimmed ? 0.15 : isHovered ? 1 : 0.6}
                  filter={isHovered ? "url(#glow)" : "none"}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredFlow(i)}
                  onMouseLeave={() => setHoveredFlow(null)}
                  onClick={() => {
                    const target = targetNodes.find(t => t.name === flow.target);
                    if (target && onCategoryClick) {
                      onCategoryClick(target);
                    }
                  }}
                >
                  <title>{`${flow.source} → ${flow.target}: ₹${flow.value.toLocaleString()}`}</title>
                </path>
              </g>
            );
          })}

          <g>
            <rect
              x={sourceNode.x}
              y={sourceNode.y}
              width={sourceWidth}
              height={sourceNode.height}
              fill="#10b981"
              rx="12"
              opacity="0.8"
            />
            <text
              x={sourceNode.x + sourceWidth / 2}
              y={sourceNode.y - 30}
              fill="#1e293b"
              fontSize="18"
              fontWeight="bold"
              textAnchor="middle"
            >
              {sources[0].name}
            </text>
            <text
              x={sourceNode.x + sourceWidth / 2}
              y={sourceNode.y + sourceNode.height / 2 - 10}
              fill="white"
              fontSize="24"
              fontWeight="bold"
              textAnchor="middle"
            >
              ₹{sources[0].value.toLocaleString()}
            </text>
            <text
              x={sourceNode.x + sourceWidth / 2}
              y={sourceNode.y + sourceNode.height / 2 + 15}
              fill="white"
              fontSize="14"
              textAnchor="middle"
              opacity="0.9"
            >
              100%
            </text>
          </g>

          {targetNodes.map((target, i) => (
            <g 
              key={`target-${i}`}
              onClick={() => onCategoryClick && onCategoryClick(target)}
              className="cursor-pointer"
            >
              <text
                x={target.x + targetWidth / 2}
                y={target.y - 12}
                fill="#334155"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
              >
                {target.name}
              </text>
              
              <rect
                x={target.x}
                y={target.y}
                width={targetWidth}
                height={target.height}
                fill={target.color}
                rx="12"
                className="hover:opacity-90 transition-opacity"
              />
              
              <text
                x={target.x + targetWidth / 2}
                y={target.y + target.height / 2 - 5}
                fill="white"
                fontSize="18"
                fontWeight="bold"
                textAnchor="middle"
              >
                ₹{target.value.toLocaleString()}
              </text>
              
              <text
                x={target.x + targetWidth / 2}
                y={target.y + target.height / 2 + 18}
                fill="white"
                fontSize="13"
                textAnchor="middle"
                opacity="0.95"
              >
                {((target.value / total) * 100).toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    </motion.div>
  );
}