import React, { useState } from 'react';
import { 
  FlaskConical, 
  Play, 
  Zap, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { simulationApi } from '../services/api';

interface SimulationLabPageProps {
  setActiveTab: (tab: string) => void;
  setSelectedCaseId: (id: string) => void;
}

export const SimulationLabPage: React.FC<SimulationLabPageProps> = ({ setActiveTab, setSelectedCaseId }) => {
  const [running, setRunning] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  const scenarios = [
    {
      id: 'temporary_failure',
      title: 'Temporary Bank Failure',
      amount: '₹2,499',
      desc: 'Simulates network degradation. AI diagnoses temporary failure & triggers automatic retry recovery.',
      badge: 'Case 1 Demo',
      color: 'emerald'
    },
    {
      id: 'checkout_abandonment',
      title: 'Checkout Abandonment',
      amount: '₹4,999',
      desc: 'Simulates cart abandonment. AI detects high intent & issues Razorpay Payment Link.',
      badge: 'Case 2 Demo',
      color: 'indigo'
    },
    {
      id: 'high_value',
      title: 'High-Value Transaction (>₹10k)',
      amount: '₹25,000',
      desc: 'Simulates high-value failure. Policy engine blocks automatic execution and routes to Human Approval Queue.',
      badge: 'Case 3 Demo',
      color: 'amber'
    },
    {
      id: 'already_succeeded',
      title: 'Payment Already Succeeded',
      amount: '₹3,499',
      desc: 'Simulates duplicate event. Policy engine halts action to prevent duplicate recovery.',
      badge: 'Case 4 Demo',
      color: 'rose'
    },
    {
      id: 'insufficient_funds',
      title: 'Insufficient Funds',
      amount: '₹7,999',
      desc: 'Simulates card decline due to funds. AI issues Payment Link for alternative payment method.',
      badge: 'Preset 5',
      color: 'indigo'
    },
    {
      id: 'multiple_failures',
      title: 'Repeated Retries Exceeded',
      amount: '₹1,899',
      desc: 'Simulates customer with 2+ failed retries. Policy engine halts auto retries and escalates.',
      badge: 'Preset 6',
      color: 'amber'
    }
  ];

  const runScenario = async (id: string) => {
    setRunning(true);
    setActiveScenario(id);
    setLogs([`🚀 Launching Simulation Scenario: ${id}...`]);

    try {
      addLog(`[1/5] Creating simulated payment event...`);
      await new Promise(r => setTimeout(r, 600));

      addLog(`[2/5] Event ingested. AI Agent gathering context & historical customer signals...`);
      await new Promise(r => setTimeout(r, 700));

      const result = await simulationApi.triggerScenario(id);
      
      addLog(`[3/5] AI Diagnosis complete! Probability: ${(result.recovery_case_id ? 87 : 75)}%`);
      await new Promise(r => setTimeout(r, 600));

      addLog(`[4/5] Policy Safety Engine evaluated constraints: ${result.message}`);
      await new Promise(r => setTimeout(r, 600));

      addLog(`[5/5] Action executed! Case ID: ${result.recovery_case_id || 'N/A'}`);
      setLastResult(result);
    } catch (e: any) {
      addLog(`❌ Error running scenario: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            <h1 className="text-2xl font-extrabold text-white">Simulation Lab & Demo Center</h1>
            {activeScenario && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Running: {activeScenario}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Interactive sandbox environment for testing and evaluating RecoverAI payment scenarios.</p>
        </div>

        <button
          onClick={() => runScenario('temporary_failure')}
          disabled={running}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>Run 5-Min Judge Demo Story</span>
        </button>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((sc) => (
          <div key={sc.id} className="glass-card glass-card-hover p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {sc.badge}
                </span>
                <span className="font-extrabold text-white text-base font-mono">{sc.amount}</span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">{sc.title}</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{sc.desc}</p>
            </div>

            <button
              onClick={() => runScenario(sc.id)}
              disabled={running}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-semibold text-xs transition border border-slate-700 hover:border-indigo-500"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Scenario</span>
            </button>
          </div>
        ))}
      </div>

      {/* Live Simulation Execution Terminal */}
      {logs.length > 0 && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Simulation Execution Output Stream
            </h3>
            {lastResult?.recovery_case_id && (
              <button
                onClick={() => { setSelectedCaseId(lastResult.recovery_case_id); setActiveTab('case_detail'); }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                Inspect Generated Case ({lastResult.recovery_case_id}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 space-y-1.5 border border-slate-800 max-h-60 overflow-y-auto">
            {logs.map((line, idx) => (
              <div key={idx} className="leading-relaxed">{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
