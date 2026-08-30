import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Bot, 
  ShieldAlert, 
  User, 
  CreditCard, 
  Clock, 
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { recoveryApi, auditApi } from '../services/api';
import type { RecoveryCase, AuditLog } from '../types';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

interface CaseDetailPageProps {
  caseId: string;
  setActiveTab: (tab: string) => void;
}

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({ caseId, setActiveTab }) => {
  const [recCase, setRecCase] = useState<RecoveryCase | null>(null);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [caseId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await recoveryApi.getCaseById(caseId);
      setRecCase(data);
      if (data.payment_id) {
        const logs = await auditApi.getCaseTimeline(data.payment_id);
        setTimeline(logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      const updated = await recoveryApi.retryCase(caseId);
      showToast(`Retry executed successfully! Status: ${updated.status}`);
      loadDetail();
    } catch (e: any) {
      showToast(`Retry failed or blocked by policy: ${e.response?.data?.detail || e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setActionLoading(true);
    try {
      const updated = await recoveryApi.createPaymentLink(caseId);
      showToast(`Razorpay Payment Link generated successfully! Status: ${updated.status}`);
      loadDetail();
    } catch (e: any) {
      showToast(`Payment Link creation blocked/failed: ${e.response?.data?.detail || e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await recoveryApi.approveCase(caseId, "Approved via Case Detail view");
      showToast(`Human approval granted! Case recovery initiated.`);
      loadDetail();
    } catch (e: any) {
      showToast(`Approval failed: ${e.response?.data?.detail || e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !recCase) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Clock className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const latestDecision = recCase.decisions && recCase.decisions.length > 0 ? recCase.decisions[recCase.decisions.length - 1] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 p-4 rounded-xl flex items-center justify-between text-xs font-bold shadow-lg animate-fade-in">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('cases')}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cases</span>
        </button>

        <div className="flex items-center space-x-3">
          {recCase.status === 'PENDING_APPROVAL' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20"
            >
              Approve Recovery Action
            </button>
          )}

          <button
            onClick={handleRetry}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Force Retry</span>
          </button>

          <button
            onClick={handleCreateLink}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Generate Payment Link</span>
          </button>
        </div>
      </div>

      {/* Case Overview Banner */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-white">{recCase.id}</h1>
            <StatusBadge status={recCase.status} />
            <RiskBadge level={recCase.risk_level} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">Payment ID: {recCase.payment_id} | Created: {new Date(recCase.created_at).toLocaleString()}</p>
        </div>

        <div className="flex items-center space-x-8 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Amount at Risk</p>
            <p className="text-xl font-extrabold text-white">₹{recCase.amount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Recovered Amount</p>
            <p className="text-xl font-extrabold text-emerald-400">₹{recCase.recovered_amount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Recovery Prob</p>
            <p className="text-xl font-extrabold text-indigo-400 font-mono">{(recCase.recovery_probability * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Requirement #4: POLICY BLOCKED Banner for High Value / Blocked Cases */}
      {!recCase.policy_passed && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-extrabold text-sm text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <span>POLICY BLOCKED — Bounded Safety Rule Triggered</span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-rose-500/20 px-2.5 py-0.5 rounded text-rose-300">
              SAFETY RULE #4
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {recCase.policy_reason || `Amount ₹${recCase.amount.toLocaleString('en-IN')} exceeds maximum automated threshold ₹10,000. Human approval required.`}
          </p>
          
          {/* Pipeline Progress Indicator */}
          <div className="pt-3 border-t border-rose-500/20 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="text-slate-400">Pipeline Flow:</span>
            <div className="flex items-center space-x-2 font-bold">
              <span className={recCase.status === 'PENDING_APPROVAL' ? 'text-amber-400 underline' : 'text-slate-500'}>PENDING APPROVAL</span>
              <span>→</span>
              <span className={recCase.status === 'IN_PROGRESS' ? 'text-indigo-400 underline' : 'text-slate-500'}>PAYMENT LINK GENERATED</span>
              <span>→</span>
              <span className={recCase.status === 'RECOVERED' ? 'text-emerald-400 underline' : 'text-slate-500'}>RECOVERED</span>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Context & WHY THIS DECISION Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Requirement #3: WHY THIS DECISION? Evidence Panel */}
          <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-extrabold text-sm uppercase tracking-wider">
                <Bot className="w-5 h-5" />
                <span>WHY THIS DECISION? (AI & Policy Evidence Breakdown)</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Confidence: {((latestDecision?.confidence || 0.88) * 100).toFixed(0)}%
              </span>
            </div>

            {/* Evidence Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[11px] block">Transaction Amount</span>
                <strong className="text-white text-sm">₹{recCase.amount.toLocaleString('en-IN')}</strong>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[11px] block">Automatic Limit</span>
                <strong className="text-slate-300 text-sm">₹10,000</strong>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[11px] block">Customer History</span>
                <strong className="text-emerald-400 text-sm">{recCase.customer?.previous_successes || 0} Succ / {recCase.customer?.previous_failures || 0} Fail</strong>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[11px] block">Retry Count</span>
                <strong className="text-slate-300 text-sm">{recCase.payment?.retry_count || 0} Retries</strong>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[11px] block">Checkout Duration</span>
                <strong className="text-slate-300 text-sm">45s</strong>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[11px] block">Policy Result</span>
                <strong className={recCase.policy_passed ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
                  {recCase.policy_passed ? 'PASSED ✓' : 'BLOCKED ✕'}
                </strong>
              </div>
            </div>

            {/* AI Recommendation Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-400">AI Decision Strategy:</span>
                <span className="text-indigo-400 font-mono text-sm uppercase">{recCase.recommended_strategy}</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-medium">
                <strong className="text-slate-400">Reason: </strong>
                {latestDecision?.reasoning || recCase.policy_reason || "AI agent evaluated transaction features and selected optimal strategy."}
              </p>
            </div>
          </div>

          {/* Customer & Transaction Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-slate-300 font-bold text-xs">
                <User className="w-4 h-4 text-indigo-400" />
                <span>Customer Profile</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <p><span className="text-slate-500">Name:</span> <strong className="text-white">{recCase.customer?.name}</strong></p>
                <p><span className="text-slate-500">Email:</span> {recCase.customer?.email}</p>
                <p><span className="text-slate-500">History:</span> {recCase.customer?.previous_successes} Successes / {recCase.customer?.previous_failures} Failures</p>
                <p><span className="text-slate-500">LTV:</span> ₹{(recCase.customer?.lifetime_value || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-slate-300 font-bold text-xs">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Transaction Context</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <p><span className="text-slate-500">Method:</span> <strong className="text-white uppercase">{recCase.payment?.payment_method}</strong></p>
                <p><span className="text-slate-500">Failure Reason:</span> {recCase.payment?.failure_reason}</p>
                <p><span className="text-slate-500">Retry Count:</span> {recCase.payment?.retry_count}</p>
                <p><span className="text-slate-500">Checkout Duration:</span> 45s</p>
              </div>
            </div>
          </div>

          {/* Requirement #6: Clearer Recovery Execution Attempts Flow */}
          {recCase.attempts && recCase.attempts.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Recovery Execution Attempts</h3>
              <div className="space-y-3">
                {recCase.attempts.map((att) => (
                  <div key={att.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Attempt #{att.attempt_number} • {att.strategy.replace(/_/g, ' ')}</span>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${att.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
                        {att.status === 'SUCCESS' ? 'SUCCESS ✓' : att.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                      <span>Amount: <strong className="text-white">₹{recCase.amount.toLocaleString('en-IN')}</strong></span>
                      {att.status === 'SUCCESS' && <span className="text-emerald-400 font-bold">Recovered: ₹{recCase.recovered_amount.toLocaleString('en-IN')}</span>}
                    </div>

                    {att.razorpay_link_url && (
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px] truncate max-w-[240px] font-mono">{att.razorpay_link_url}</span>
                        <a
                          href={att.razorpay_link_url}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center space-x-1 shadow-md shadow-emerald-600/20"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Simulation Payment</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Step-by-Step Audit Timeline */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Audit Log Timeline
          </h3>

          <div className="relative border-l-2 border-slate-800 ml-3 space-y-6 py-2">
            {timeline.map((log) => (
              <div key={log.id} className="ml-6 relative">
                {/* Node circle */}
                <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {log.actor}
                    </span>
                  </div>
                  
                  <p className="text-xs font-bold text-white mt-1">{log.action}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{log.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
