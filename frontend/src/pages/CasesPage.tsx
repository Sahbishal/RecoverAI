import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, ChevronRight } from 'lucide-react';
import { recoveryApi } from '../services/api';
import type { RecoveryCase } from '../types';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

interface CasesPageProps {
  setActiveTab: (tab: string) => void;
  setSelectedCaseId: (id: string) => void;
}

export const CasesPage: React.FC<CasesPageProps> = ({ setActiveTab, setSelectedCaseId }) => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await recoveryApi.getCases(statusFilter === 'ALL' ? undefined : statusFilter);
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.payment_id.toLowerCase().includes(search.toLowerCase()) ||
    (c.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer?.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Merchant Recovery Cases</h1>
          <p className="text-sm text-slate-400">Manage and inspect all detected risky transaction recovery workflows.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={loadCases}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Case ID, Txn ID, Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          {['ALL', 'RECOVERED', 'PENDING_APPROVAL', 'IN_PROGRESS', 'FAILED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold border-b border-slate-800 text-[11px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Case ID / Txn</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Failure Reason</th>
                <th className="px-6 py-4">Risk</th>
                <th className="px-6 py-4">AI Recovery Prob</th>
                <th className="px-6 py-4">Strategy</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredCases.map((c) => (
                <tr 
                  key={c.id} 
                  className="hover:bg-slate-800/40 transition cursor-pointer"
                  onClick={() => { setSelectedCaseId(c.id); setActiveTab('case_detail'); }}
                >
                  <td className="px-6 py-4 font-mono">
                    <span className="font-bold text-white block">{c.id}</span>
                    <span className="text-slate-500 text-[11px]">{c.payment_id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-white block">{c.customer?.name || 'Customer'}</span>
                    <span className="text-slate-500 text-[11px]">{c.customer?.email}</span>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-white">
                    ₹{c.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {c.risk_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <RiskBadge level={c.risk_level} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                        <div 
                          className={`h-full ${c.recovery_probability >= 0.75 ? 'bg-emerald-400' : 'bg-amber-400'}`} 
                          style={{ width: `${c.recovery_probability * 100}%` }}
                        />
                      </div>
                      <span className="font-bold font-mono">{(c.recovery_probability * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-indigo-300">
                    {c.recommended_strategy}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                      <ChevronRight className="w-4 h-4" />
                    </button>
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
