import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  FlaskConical, 
  FileText, 
  Settings, 
  BrainCircuit,
  Zap,
  UserCheck
} from 'lucide-react';
import { settingsApi } from '../services/api';
import type { MerchantSettings } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, pendingApprovalsCount = 0 }) => {
  const [merchant, setMerchant] = useState<MerchantSettings | null>(null);

  useEffect(() => {
    loadMerchant();
  }, []);

  const loadMerchant = async () => {
    try {
      const data = await settingsApi.getMerchantSettings();
      setMerchant(data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMode = async () => {
    if (!merchant) return;
    const newMode = merchant.razorpay_mode === 'TEST' ? 'SIMULATION' : 'TEST';
    try {
      const updated = await settingsApi.updateMerchantSettings({ razorpay_mode: newMode });
      setMerchant(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Recovery Cases', icon: Layers },
    { id: 'approvals', label: 'Human Approvals', icon: UserCheck, badge: pendingApprovalsCount },
    { id: 'simulation', label: 'Simulation Lab', icon: FlaskConical },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'analytics', label: 'AI & ML Model', icon: BrainCircuit },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-white">Recover<span className="text-indigo-400">AI</span></span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Revenue Recovery</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mode Switcher Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMode}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              merchant?.razorpay_mode === 'TEST'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${merchant?.razorpay_mode === 'TEST' ? 'bg-emerald-400 animate-ping' : 'bg-indigo-400'}`} />
            <span>
              {merchant?.razorpay_mode === 'TEST' ? 'Razorpay Test Mode' : 'Demo Simulation Mode'}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
