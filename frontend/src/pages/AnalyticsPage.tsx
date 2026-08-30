import React, { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2, BarChart2, Cpu } from 'lucide-react';
import { settingsApi } from '../services/api';
import type { MLMetrics } from '../types';
import { KPICard } from '../components/KPICard';

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await settingsApi.getMLMetrics();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!metrics) return null;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
          <BrainCircuit className="w-4 h-4" />
          <span>Requirement #10 - ML Recovery Scoring Model</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">ML Model Evaluation & Explainability</h1>
        <p className="text-sm text-slate-400">Scikit-Learn Random Forest Classifier trained on 600 synthetic transaction records evaluated on 20% held-out test set.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Model Accuracy" value={`${(metrics.accuracy * 100).toFixed(1)}%`} subtitle="Held-out 20% test set" icon={CheckCircle2} color="emerald" />
        <KPICard title="Precision" value={`${(metrics.precision * 100).toFixed(1)}%`} subtitle="True positive precision" icon={BarChart2} color="indigo" />
        <KPICard title="Recall" value={`${(metrics.recall * 100).toFixed(1)}%`} subtitle="Recovery recall coverage" icon={Cpu} color="amber" />
        <KPICard title="F1 Score" value={`${(metrics.f1_score * 100).toFixed(1)}%`} subtitle="Harmonic mean performance" icon={BrainCircuit} color="emerald" />
      </div>

      {/* Feature Importance */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Feature Importance Breakdown</h3>
        <p className="text-xs text-slate-400">Key predictor signals influencing automated recovery probability scoring:</p>

        <div className="space-y-3 pt-2">
          {Object.entries(metrics.feature_importance).map(([feature, importance]) => (
            <div key={feature} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 capitalize">{feature.replace(/_/g, ' ')}</span>
                <span className="text-indigo-400 font-bold">{(importance * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full" 
                  style={{ width: `${Math.max(5, importance * 300)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
