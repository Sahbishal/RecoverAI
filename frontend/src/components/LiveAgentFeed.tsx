import React from 'react';
import { Bot, ShieldCheck, Zap } from 'lucide-react';
import type { RecoveryCase } from '../types';

interface LiveAgentFeedProps {
  cases: RecoveryCase[];
}

export const LiveAgentFeed: React.FC<LiveAgentFeedProps> = ({ cases }) => {
  const activeCases = cases.slice(0, 4);

  return (
    <div className="glass-card p-5 rounded-2xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Bot className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Live Agent Activity Feed
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h3>
            <p className="text-xs text-slate-400">Autonomous reasoning & policy execution log</p>
          </div>
        </div>
        <span className="text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">
          REAL-TIME
        </span>
      </div>

      <div className="mt-4 space-y-4 max-h-[380px] overflow-y-auto pr-1">
        {activeCases.map((c) => (
          <div key={c.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Zap className="w-3.5 h-3.5" />
                Detected Failed Payment: ₹{c.amount.toLocaleString('en-IN')}
              </span>
              <span className="font-mono text-slate-400">{c.payment_id}</span>
            </div>

            <div className="space-y-1 font-mono text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span>🤖 Analyzing customer history...</span>
                <span className="text-emerald-400 font-bold">{(c.recovery_probability * 100).toFixed(0)}% Prob</span>
              </div>
              <div className="text-slate-400">
                Diagnosis: <span className="text-slate-200">{c.risk_type}</span> | Strategy: <span className="text-indigo-300">{c.recommended_strategy}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 pt-1 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Policy Check Passed
                </span>
                <span>{c.status === 'RECOVERED' ? `₹${c.recovered_amount.toLocaleString('en-IN')} Recovered ✓` : c.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
