import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  CreditCard, 
  User, 
  Building2, 
  Zap, 
  RefreshCw
} from 'lucide-react';
import { simulationApi } from '../services/api';

interface SimulatedPaymentPageProps {
  linkId: string;
  setActiveTab: (tab: string) => void;
  setSelectedCaseId: (id: string) => void;
}

export const SimulatedPaymentPage: React.FC<SimulatedPaymentPageProps> = ({ linkId, setActiveTab, setSelectedCaseId }) => {
  const [linkDetails, setLinkDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadDetails();
  }, [linkId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await simulationApi.getPayLinkDetails(linkId);
      setLinkDetails(data);
    } catch (e) {
      console.error('Error fetching simulated link details', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (status: 'success' | 'failed') => {
    setSubmitting(true);
    try {
      const res = await simulationApi.executeSimulatedPayLink(linkId, status);
      setResult(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading Razorpay Test Mode Simulation Gateway...</p>
        </div>
      </div>
    );
  }

  if (!linkDetails) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-4 max-w-lg mx-auto mt-12 border border-slate-800">
        <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Payment Link Not Found</h2>
        <p className="text-xs text-slate-400">The simulated payment link `{linkId}` does not exist or has expired.</p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16 pt-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (linkDetails.case_id) {
              setSelectedCaseId(linkDetails.case_id);
              setActiveTab('case_detail');
            } else {
              setActiveTab('dashboard');
            }
          }}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Case Detail</span>
        </button>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          Razorpay Test Mode – Simulation
        </span>
      </div>

      {/* Simulated Payment Card */}
      <div className="glass-card p-8 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden space-y-6">
        
        {/* Merchant Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-extrabold text-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">{linkDetails.merchant_name}</h2>
              <p className="text-xs text-slate-400 font-mono">Link ID: {linkDetails.link_id}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700">
            TEST MODE
          </span>
        </div>

        {/* Amount Box */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Amount Due</p>
            <p className="text-3xl font-extrabold text-white mt-0.5">₹{linkDetails.amount.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right font-mono text-xs text-slate-400">
            <p>Order: <span className="text-slate-200">{linkDetails.order_id}</span></p>
            <p>Case: <span className="text-indigo-400 font-bold">{linkDetails.case_id}</span></p>
          </div>
        </div>

        {/* Customer & Payment Method Context */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Customer
            </span>
            <p className="font-bold text-white">{linkDetails.customer_name}</p>
            <p className="text-slate-400 text-[11px] truncate">{linkDetails.customer_email}</p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              Preferred Method
            </span>
            <p className="font-bold text-white uppercase">{linkDetails.payment_method}</p>
            <p className="text-emerald-400 text-[11px]">Authorized Link</p>
          </div>
        </div>

        {/* Success Result Card */}
        {result ? (
          <div className={`p-6 rounded-2xl border space-y-4 ${
            result.status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center space-x-3">
              {result.status === 'success' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {result.status === 'success' ? 'Simulated Payment Successful!' : 'Simulated Payment Failed'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">{result.message}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-xs font-mono text-slate-400">Status: <strong className="text-white">{result.case_status}</strong></span>
              <button
                onClick={() => {
                  setSelectedCaseId(linkDetails.case_id);
                  setActiveTab('case_detail');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Inspect Updated Case ({linkDetails.case_id})
              </button>
            </div>
          </div>
        ) : (
          /* Simulation Triggers */
          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleSimulatePayment('success')}
              disabled={submitting || linkDetails.status === 'SUCCESS'}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Simulate Payment Success (₹{linkDetails.amount.toLocaleString('en-IN')})</span>
            </button>

            <button
              onClick={() => handleSimulatePayment('failed')}
              disabled={submitting || linkDetails.status === 'SUCCESS'}
              className="w-full py-2.5 bg-slate-900 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 font-semibold text-xs rounded-xl border border-slate-800 hover:border-rose-500/40 transition flex items-center justify-center space-x-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Simulate Payment Failure</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
