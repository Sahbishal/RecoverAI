import React, { useEffect, useState } from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  AlertTriangle, 
  UserCheck, 
  RefreshCw, 
  Play,
  Zap,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

import { KPICard } from '../components/KPICard';
import { LiveAgentFeed } from '../components/LiveAgentFeed';
import { dashboardApi, recoveryApi, simulationApi } from '../services/api';
import type { DashboardMetrics, DashboardCharts, RecoveryCase } from '../types';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
  setSelectedCaseId: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab, setSelectedCaseId }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, casesRes] = await Promise.all([
        dashboardApi.getMetrics(),
        dashboardApi.getCharts(),
        recoveryApi.getCases(),
      ]);
      setMetrics(mRes);
      setCharts(cRes);
      setCases(casesRes);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickScenario = async (type: string) => {
    try {
      const res = await simulationApi.triggerScenario(type);
      setActionMessage(res.message);
      fetchData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };


  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading RecoverAI Intelligence Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Toast Banner */}
      {actionMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center justify-between text-sm animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-emerald-900/20 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Revenue Recovery Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">Autonomous AI Agent continuously detecting, diagnosing, and executing bounded recoveries.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleQuickScenario('temporary_failure')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Recovery (₹2,499)</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          title="Revenue at Risk"
          value={`₹${(metrics?.revenue_at_risk || 0).toLocaleString('en-IN')}`}
          subtitle="Identified lost merchant payments"
          icon={AlertTriangle}
          color="rose"
        />
        <KPICard
          title="Revenue Recovered"
          value={`₹${(metrics?.revenue_recovered || 0).toLocaleString('en-IN')}`}
          subtitle="Autonomously closed recoveries"
          icon={IndianRupee}
          color="emerald"
          trend="+18.4%"
          trendType="positive"
        />
        <KPICard
          title="Recovery Rate"
          value={`${metrics?.recovery_rate || 0}%`}
          subtitle="Success conversion ratio"
          icon={TrendingUp}
          color="indigo"
          trend="+4.2%"
        />
        <KPICard
          title="Auto Recoveries"
          value={metrics?.automatic_recoveries_count || 0}
          subtitle="Bounded auto-resolved cases"
          icon={Zap}
          color="emerald"
        />
        <KPICard
          title="Policy Blocks"
          value={metrics?.policy_blocks_count || 0}
          subtitle="Safety engine rule triggers"
          icon={ShieldAlert}
          color="amber"
        />
        <KPICard
          title="Human Escalations"
          value={metrics?.human_escalations_count || 0}
          subtitle="Flagged for merchant review"
          icon={UserCheck}
          color="rose"
        />
      </div>

      {/* Charts & Live Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Risk vs Recovered Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Revenue at Risk vs Recovered</h3>
              <p className="text-xs text-slate-400">Monthly breakdown of detected vs recovered revenue</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Live DB Sync
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.risk_vs_recovered || []}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Area type="monotone" dataKey="at_risk" name="At Risk" stroke="#f43f5e" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
                <Area type="monotone" dataKey="recovered" name="Recovered" stroke="#10b981" fillOpacity={1} fill="url(#colorRec)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Agent Activity Feed */}
        <div className="lg:col-span-1">
          <LiveAgentFeed cases={cases} />
        </div>

      </div>

      {/* Failure Reason & Strategy Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Failures by Reason */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <h3 className="text-base font-bold text-white mb-1">Failed Payments by Root Cause</h3>
          <p className="text-xs text-slate-400 mb-4">AI diagnosed failure classification distribution</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.failures_by_reason || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="reason" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Active Cases Table Snapshot */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Recent Active Recovery Cases</h3>
            <button 
              onClick={() => setActiveTab('cases')} 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              View All Cases <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {cases.slice(0, 4).map((c) => (
              <div 
                key={c.id} 
                onClick={() => { setSelectedCaseId(c.id); setActiveTab('case_detail'); }}
                className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <p className="text-xs font-bold text-white">{c.id} • {c.customer?.name || 'Customer'}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{c.risk_type.replace(/_/g, ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-white">₹{c.amount.toLocaleString('en-IN')}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'RECOVERED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
