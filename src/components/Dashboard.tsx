import React from 'react';
import { TrendingUp, ShoppingCart, AlertCircle, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Stats } from '../types';

interface DashboardProps {
  stats: Stats | null;
  lowStockThreshold: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, lowStockThreshold }) => {
  if (!stats) return <div className="p-8">Loading stats...</div>;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Business Overview</h1>
        <p className="text-zinc-500 mt-1">Real-time performance metrics</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
          </div>
          <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">${stats.revenue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-500">Total Transactions</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.salesCount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-500">Low Stock Items (&lt;{lowStockThreshold})</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.lowStockCount}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <h2 className="font-bold text-zinc-900 mb-6">Revenue Last 7 Days</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#f8f8f8' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">Recent Transactions</h2>
          <button className="text-sm text-emerald-600 font-semibold hover:underline">View All</button>
        </div>
        <div className="divide-y divide-zinc-100">
          {stats.recentSales.map((sale) => (
            <div key={sale.id} className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                  <History size={20} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Sale #{sale.id}</p>
                  <p className="text-xs text-zinc-500">{new Date(sale.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-zinc-900">${sale.total_amount.toFixed(2)}</p>
                <p className="text-xs text-zinc-500">{sale.item_count} items</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
