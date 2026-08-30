import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, UserCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { recoveryApi } from '../services/api';
import type { RecoveryCase } from '../types';

export const HumanApprovalsPage: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvedCaseLink, setApprovedCaseLink] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    loadApprovalQueue();
  }, []);

  const loadApprovalQueue = async () => {
    setLoading(true);
    try {
      const data = await recoveryApi.getCases('PENDING_APPROVAL');
      setCases(data);
    } catch (e) {
      console.error('Error fetching approval queue', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (caseId: string) => {
    setProcessingId(caseId);
    try {
      const updated = await recoveryApi.approveCase(caseId, "Approved via Human Approvals Queue");
      
      // Check if attempt created a link
      const attempts = updated.attempts || [];
      const linkAttempt = attempts.find((a) => a.razorpay_link_url);
      if (linkAttempt) {
        setApprovedCaseLink({ id: caseId, url: linkAttempt.razorpay_link_url! });
      }

      loadApprovalQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (caseId: string) => {
    setProcessingId(caseId);
    try {
      await recoveryApi.rejectCase(caseId, "Rejected by merchant operator");
      loadApprovalQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-extrabold text-white">Merchant Human Approval Queue</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">High-value transactions and low-confidence AI recommendations flagged by Bounded Safety Engine.</p>
        </div>
        <span className="text-xs font-bold font-mono px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/30">
          {cases.length} PENDING APPROVAL
        </span>
      </div>

      {/* Instant Approved Payment Link Banner */}
      {approvedCaseLink && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-emerald-300 space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-extrabold text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Human Approval Granted! Razorpay Payment Link Generated</span>
            </div>
            <button onClick={() => setApprovedCaseLink(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-xs text-slate-200">
            Case `{approvedCaseLink.id}` state updated: <strong className="text-white">APPROVED → PAYMENT LINK GENERATED</strong>. Click below to launch internal simulation payment:
          </p>
          <a
            href={approvedCaseLink.url}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Simulation Payment Gateway</span>
          </a>
        </div>
      )}

      {/* Approval List */}
      {cases.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-slate-800 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Approval Queue Clear</h3>
          <p className="text-xs text-slate-400">All high-value and flagged transactions have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <div key={c.id} className="glass-card p-6 rounded-2xl border border-amber-500/30 space-y-4 shadow-lg">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-extrabold text-white">{c.id}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      POLICY BLOCKED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Customer: <strong className="text-white">{c.customer?.name}</strong> ({c.customer?.email})</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">Transaction Amount</p>
                  <p className="text-2xl font-extrabold text-rose-400">₹{c.amount.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Policy Block Explanation Box */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-rose-500/20 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Why is Approval Required?</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-medium">
                  {c.policy_reason || `Amount ₹${c.amount.toLocaleString('en-IN')} exceeds maximum automated threshold ₹10,000. Safety engine halted automatic retry and requires explicit merchant approval.`}
                </p>
                <div className="pt-2 font-mono text-[11px] text-slate-400 flex items-center justify-between">
                  <span>AI Confidence: <strong className="text-indigo-400">{((c.recovery_probability || 0.74) * 100).toFixed(0)}%</strong></span>
                  <span>Strategy: <strong className="text-white uppercase">{c.recommended_strategy}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => handleReject(c.id)}
                  disabled={processingId === c.id}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 font-bold text-xs border border-slate-700 hover:border-rose-500/30 transition"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject & Halt</span>
                </button>

                <button
                  onClick={() => handleApprove(c.id)}
                  disabled={processingId === c.id}
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Recovery Action</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
