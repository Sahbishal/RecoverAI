import React, { useEffect, useState } from 'react';
import { Save, Shield, CheckCircle2 } from 'lucide-react';
import { settingsApi } from '../services/api';
import type { MerchantSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getMerchantSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await settingsApi.updateMerchantSettings(settings);
      setSettings(updated);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Merchant & Policy Settings</h1>
        <p className="text-sm text-slate-400">Configure financial safety boundaries, Razorpay API modes, and AI confidence thresholds.</p>
      </div>

      {savedMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center space-x-2 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Policy & Merchant settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Safety Engine Thresholds */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Policy & Bounded Safety Engine Controls</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Maximum Automatic Retries</label>
              <input
                type="number"
                value={settings.max_auto_retries}
                onChange={(e) => setSettings({ ...settings, max_auto_retries: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Halt automatic retries after this limit (Requirement #7).</p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Max Automatic Recovery Amount (INR)</label>
              <input
                type="number"
                value={settings.max_auto_amount}
                onChange={(e) => setSettings({ ...settings, max_auto_amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Transactions exceeding this require Human Approval Queue (Default: ₹10,000).</p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Minimum AI Decision Confidence</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="1.0"
                value={settings.min_ai_confidence}
                onChange={(e) => setSettings({ ...settings, min_ai_confidence: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Decisions below this confidence require merchant manual review (Default: 70%).</p>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Razorpay Operating Mode</label>
              <select
                value={settings.razorpay_mode}
                onChange={(e) => setSettings({ ...settings, razorpay_mode: e.target.value as 'TEST' | 'SIMULATION' })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-semibold focus:border-indigo-500"
              >
                <option value="SIMULATION">Demo Simulation Mode (Default)</option>
                <option value="TEST">Razorpay Test Mode (Real SDK & Credentials)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Toggle between live Razorpay Test API calls and simulation lab.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Merchant Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
