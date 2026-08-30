import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Bot, User, Server, Webhook } from 'lucide-react';
import { auditApi } from '../services/api';
import type { AuditLog } from '../types';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actorFilter, setActorFilter] = useState<string>('ALL');

  useEffect(() => {
    loadLogs();
  }, [actorFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditApi.getLogs(actorFilter === 'ALL' ? undefined : actorFilter);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'AI_AGENT': return <Bot className="w-4 h-4 text-indigo-400" />;
      case 'POLICY_ENGINE': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'MERCHANT': return <User className="w-4 h-4 text-amber-400" />;
      case 'RAZORPAY_WEBHOOK': return <Webhook className="w-4 h-4 text-rose-400" />;
      default: return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">System Audit Trail</h1>
          <p className="text-sm text-slate-400">Immutable, timestamped event audit history across all system actors.</p>
        </div>

        <button 
          onClick={loadLogs}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 flex items-center space-x-2 overflow-x-auto">
        {['ALL', 'AI_AGENT', 'POLICY_ENGINE', 'SYSTEM', 'MERCHANT', 'RAZORPAY_WEBHOOK'].map((act) => (
          <button
            key={act}
            onClick={() => setActorFilter(act)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              actorFilter === act
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {act.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold border-b border-slate-800 text-[11px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Event Type</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Reason / Notes</th>
                <th className="px-6 py-4">Policy Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center space-x-2 font-bold text-white">
                      {getActorIcon(log.actor)}
                      <span>{log.actor}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-indigo-300">
                    {log.event_type}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                    {log.reason}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${log.policy_result === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {log.policy_result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
