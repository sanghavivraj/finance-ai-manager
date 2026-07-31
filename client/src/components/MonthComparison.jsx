import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatINR } from '../utils/currency.js';

export default function MonthComparison() {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadComparison();
  }, []);

  const loadComparison = async () => {
    const response = await api.get('/dashboard/monthly-comparison');
    setData(response.data);
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-4 text-lg">Monthly Spending Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(val) => `₹${val/1000}k`} />
          <Tooltip formatter={(value) => formatINR(value)} />
          <Legend />
          <Bar dataKey="spent" fill="#8b5cf6" name="Spent" radius={[8, 8, 0, 0]} />
          <Bar dataKey="budget" fill="#14b8a6" name="Budget" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}