export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  previous_successes: number;
  previous_failures: number;
  lifetime_value: number;
  opted_out: boolean;
}

export interface Payment {
  id: string;
  order_id?: string;
  customer_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  failure_reason?: string;
  retry_count: number;
  created_at: string;
}

export interface RecoveryAttempt {
  id: string;
  attempt_number: number;
  strategy: string;
  action_type: string;
  status: string;
  razorpay_link_id?: string;
  razorpay_link_url?: string;
  message_sent?: string;
  error_message?: string;
  executed_at: string;
}

export interface AgentDecision {
  id: string;
  risk_type: string;
  recovery_probability: number;
  recommended_action: string;
  reasoning: string;
  confidence: number;
  policy_passed: boolean;
  policy_check_details?: Record<string, any>;
  created_at: string;
}

export interface RecoveryCase {
  id: string;
  payment_id: string;
  customer_id: string;
  merchant_id: string;
  amount: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  risk_type: string;
  recovery_probability: number;
  recommended_strategy: string;
  status: 'DETECTED' | 'ANALYZED' | 'POLICY_PENDING' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'RECOVERED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  policy_passed: boolean;
  policy_reason?: string;
  recovered_amount: number;
  recovered_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  payment?: Payment;
  decisions?: AgentDecision[];
  attempts?: RecoveryAttempt[];
}

export interface DashboardMetrics {
  revenue_at_risk: number;
  revenue_recovered: number;
  recovery_rate: number;
  active_recovery_cases: number;
  human_escalations_count: number;
  total_failed_transactions: number;
  total_recovered_transactions: number;
  automatic_recoveries_count: number;
  policy_blocks_count: number;
  avg_recovery_time_min: number;
}

export interface DashboardCharts {
  risk_vs_recovered: Array<{ month: string; at_risk: number; recovered: number }>;
  recovery_by_strategy: Array<{ strategy: string; cases: number; recovered: number }>;
  failures_by_reason: Array<{ reason: string; count: number }>;
  monthly_trend: Array<{ month: string; at_risk: number; recovered: number }>;
}

export interface AuditLog {
  id: string;
  recovery_case_id?: string;
  payment_id?: string;
  actor: 'SYSTEM' | 'AI_AGENT' | 'POLICY_ENGINE' | 'MERCHANT' | 'RAZORPAY_WEBHOOK';
  event_type: string;
  action: string;
  reason?: string;
  policy_result?: string;
  status: string;
  extra_data?: Record<string, any>;
  created_at: string;
}

export interface MerchantSettings {
  id: string;
  name: string;
  email: string;
  razorpay_mode: 'TEST' | 'SIMULATION';
  max_auto_retries: number;
  max_auto_amount: number;
  min_ai_confidence: number;
  auto_recovery_enabled: boolean;
}

export interface MLMetrics {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  total_samples: number;
  feature_importance: Record<string, number>;
  created_at?: string;
}
