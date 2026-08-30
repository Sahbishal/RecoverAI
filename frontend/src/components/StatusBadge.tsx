import React from 'react';

interface RiskBadgeProps {
  level: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    MEDIUM: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[level] || styles.MEDIUM}`}>
      {level}
    </span>
  );
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<string, string> = {
    RECOVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    IN_PROGRESS: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse',
    PENDING_APPROVAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold',
    DETECTED: 'bg-slate-800 text-slate-300 border-slate-700',
    ANALYZED: 'bg-slate-800 text-slate-300 border-slate-700',
    FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    CANCELLED: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  const labels: Record<string, string> = {
    RECOVERED: 'Recovered ✓',
    IN_PROGRESS: 'In Progress ⚡',
    PENDING_APPROVAL: 'Human Approval Required',
    DETECTED: 'Detected',
    ANALYZED: 'Diagnosed',
    FAILED: 'Unresolved',
    CANCELLED: 'Halted',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.DETECTED}`}>
      {labels[status] || status}
    </span>
  );
};
