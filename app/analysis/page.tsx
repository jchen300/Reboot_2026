"use client";

import { useAuth } from "@/context/AuthContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import useSWR from 'swr';

// 定義一組專業的圖表顏色
const COLORS = ['#3B82F6', '#10B981', '#FBBF24', '#F87171', '#8B5CF6', '#6366F1'];


export default function AnalysisPage() {
  const { token, loading: authLoading } = useAuth();

    const { data: stats, error, isLoading } = useSWR(
        token ? ['/api/stats/categories', token] : null, 
        {
            revalidateIfStale: false,
            dedupingInterval: 2000,
        }
    );

  if (authLoading || isLoading) return <div className="p-8 text-slate-500">數據加載中...</div>;
  if (error) return <div className="p-8 text-red-500">數據讀取失敗，請重試。</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">支出結構分析</h1>
      
      {stats?.length > 0 ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats}
                cx="50%"
                cy="50%"
                innerRadius={70} // 甜甜圈核心
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
                animationDuration={1000}
              >
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-slate-50 p-20 rounded-3xl text-center text-slate-400">
          目前尚無交易數據，請先匯入帳單。
        </div>
      )}

      {/* 數據清單預覽 */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        {stats?.map((item, idx) => (
          <div key={idx} className="flex justify-between p-4 bg-white rounded-2xl border border-slate-100">
            <span className="text-slate-600 font-medium">{item.name}</span>
            <span className="text-slate-900 font-bold">${item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}