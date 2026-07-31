import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { formatINR } from '../utils/currency.js';
import { Target, TrendingUp } from 'lucide-react';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', deadline: '' });

  const addGoal = async () => {
    await api.post('/goals', { ...newGoal, target: parseFloat(newGoal.target) });
    loadGoals();
    setNewGoal({ name: '', target: '', deadline: '' });
  };

  const loadGoals = async () => {
    const { data } = await api.get('/goals');
    setGoals(data);
  };

  useEffect(() => { loadGoals(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary-700">Smart Goals</h1>
      
      {/* Add Goal Card */}
      <div className="card bg-gradient-to-br from-primary-50 to-accent-50 border-primary-200">
        <h3 className="font-semibold mb-3">Create New Goal</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input 
            className="input" 
            placeholder="Goal name (e.g., New Laptop)" 
            value={newGoal.name}
            onChange={e => setNewGoal({...newGoal, name: e.target.value})}
          />
          <input 
            className="input" 
            type="number" 
            placeholder="Target amount (₹)" 
            value={newGoal.target}
            onChange={e => setNewGoal({...newGoal, target: e.target.value})}
          />
          <input 
            className="input" 
            type="date" 
            value={newGoal.deadline}
            onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
          />
        </div>
        <button onClick={addGoal} className="btn-primary mt-3">
          <Target size={18} /> Create Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map(goal => (
          <div key={goal.id} className="card border-l-4 border-l-accent-500">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-lg">{goal.name}</h4>
              <span className="text-xs bg-accent-100 text-accent-700 px-2 py-1 rounded-full">
                {goal.ai_prediction}% likely
              </span>
            </div>
            <div className="text-sm text-slate-600 mb-2">
              Target: {formatINR(goal.target)}
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-primary-600 font-medium">{formatINR(goal.current)}</span>
              <span className="text-slate-500">{goal.progress.toFixed(0)}%</span>
            </div>
            {goal.ai_suggestion && (
              <div className="mt-3 text-xs bg-primary-50 p-2 rounded-lg text-primary-800">
                💡 AI: {goal.ai_suggestion}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}