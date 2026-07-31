import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatINR } from '../utils/currency.js';

const COLORS = ['#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#06b6d4'];

const getEmoji = (name) => {
  if (!name) return '💵';
  const n = name.toString().toLowerCase().trim();
  if (n.includes('food')) return '🍔';
  if (n.includes('shopping')) return '🛍️';
  if (n.includes('transport')) return '🚗';
  if (n.includes('bill')) return '📄';
  if (n.includes('entertainment')) return '';
  if (n.includes('saving')) return '💰';
  if (n.includes('invest')) return '📈';
  return '💵';
};

// --- INTERACTIVE DONUT CHART WITH CUSTOM LEGEND ---
export function DonutChart({ data, onSliceClick }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const onPieEnter = (_, index) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(null);

  const total = data.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const activeItem = activeIndex !== null ? data[activeIndex] : null;
  const validData = data.filter(entry => entry.value > 0);

  return (
    <div className="w-full">
      {/* Chart Area */}
      <div className="relative w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              onClick={(e) => onSliceClick && onSliceClick(e)}
              className="cursor-pointer outline-none"
              labelLine={false}
            >
              {validData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="none"
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => formatINR(value)}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {getEmoji(data.name)} {data.name}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {formatINR(data.value)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {activeItem ? (
            <>
              <span className="text-3xl mb-1">{getEmoji(activeItem.name)}</span>
              <span className="text-sm font-medium text-slate-500">{activeItem.name}</span>
              <span className="text-2xl font-bold text-slate-800">{formatINR(activeItem.value)}</span>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Budget</span>
              <span className="text-2xl font-bold text-slate-800">{formatINR(total)}</span>
            </>
          )}
        </div>
      </div>

      {/* Custom Legend - Never gets cut off! */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 px-2">
        {validData.map((entry, index) => {
          const percent = ((entry.value / total) * 100).toFixed(0);
          const isActive = activeIndex === index;
          return (
            <div 
              key={entry.name}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                isActive ? 'bg-slate-100 scale-105' : 'hover:bg-slate-50'
              }`}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-lg">{getEmoji(entry.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-700 truncate">{entry.name}</div>
                <div className="text-xs text-slate-500">{percent}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- HORIZONTAL TREND BAR CHART ---
export function TrendBar({ data }) {
  const formattedData = data.map(item => {
    const date = new Date(item.m + '-01');
    const monthName = date.toLocaleString('en', { month: 'short', year: '2-digit' });
    return {
      ...item,
      monthName: monthName,
      total: parseFloat(item.total || 0)
    };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart layout="vertical" data={formattedData} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis 
          type="number" 
          tickFormatter={(val) => `₹${val/1000}k`} 
          axisLine={false} 
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <YAxis 
          dataKey="monthName" 
          type="category" 
          width={60} 
          axisLine={false} 
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }}
        />
        <Tooltip 
          formatter={(value) => formatINR(value)}
          contentStyle={{ 
            borderRadius: '12px', 
            border: 'none', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'white'
          }}
        />
        <Bar 
          dataKey="total" 
          fill="#8b5cf6" 
          radius={[0, 6, 6, 0]} 
          maxBarSize={30}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}