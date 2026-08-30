import axios from 'axios';
import type {
  DashboardMetrics,
  DashboardCharts,
  RecoveryCase,
  AuditLog,
  MerchantSettings,
  MLMetrics
} from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const res = await api.get('/dashboard/metrics');
    return res.data;
  },
  getCharts: async (): Promise<DashboardCharts> => {
    const res = await api.get('/dashboard/charts');
    return res.data;
  },
};

export const recoveryApi = {
  getCases: async (status?: string, riskLevel?: string): Promise<RecoveryCase[]> => {
    const res = await api.get('/recovery', { params: { status, risk_level: riskLevel } });
    return res.data;
  },
  getCaseById: async (id: string): Promise<RecoveryCase> => {
    const res = await api.get(`/recovery/${id}`);
    return res.data;
  },
  retryCase: async (id: string): Promise<RecoveryCase> => {
    const res = await api.post(`/recovery/${id}/retry`);
    return res.data;
  },
  createPaymentLink: async (id: string): Promise<RecoveryCase> => {
    const res = await api.post(`/recovery/${id}/payment-link`);
    return res.data;
  },
  approveCase: async (id: string, notes?: string): Promise<RecoveryCase> => {
    const res = await api.post(`/recovery/${id}/approve`, { action: 'approve', notes });
    return res.data;
  },
  rejectCase: async (id: string, notes?: string): Promise<RecoveryCase> => {
    const res = await api.post(`/recovery/${id}/reject`, { action: 'reject', notes });
    return res.data;
  },
};

export const simulationApi = {
  triggerScenario: async (scenarioType: string, amount?: number) => {
    const res = await api.post('/simulation/trigger', { scenario_type: scenarioType, amount });
    return res.data;
  },
  getPayLinkDetails: async (linkId: string) => {
    const res = await api.get(`/simulation/pay-link/${linkId}`);
    return res.data;
  },
  executeSimulatedPayLink: async (linkId: string, status: 'success' | 'failed') => {
    const res = await api.post(`/simulation/pay-link/${linkId}`, { status });
    return res.data;
  },
};

export const auditApi = {
  getLogs: async (actor?: string, eventType?: string): Promise<AuditLog[]> => {
    const res = await api.get('/audit', { params: { actor, event_type: eventType } });
    return res.data;
  },
  getCaseTimeline: async (paymentId: string): Promise<AuditLog[]> => {
    const res = await api.get(`/audit/transaction/${paymentId}`);
    return res.data;
  },
};

export const settingsApi = {
  getMerchantSettings: async (): Promise<MerchantSettings> => {
    const res = await api.get('/settings/merchant');
    return res.data;
  },
  updateMerchantSettings: async (data: Partial<MerchantSettings>): Promise<MerchantSettings> => {
    const res = await api.put('/settings/merchant', data);
    return res.data;
  },
  getMLMetrics: async (): Promise<MLMetrics> => {
    const res = await api.get('/settings/ml-metrics');
    return res.data;
  },
};

export default api;
