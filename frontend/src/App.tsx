import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { SimulationLabPage } from './pages/SimulationLabPage';
import { HumanApprovalsPage } from './pages/HumanApprovalsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SimulatedPaymentPage } from './pages/SimulatedPaymentPage';
import { recoveryApi } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [simulatedLinkId, setSimulatedLinkId] = useState<string | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, []);

  const checkHashRoute = () => {
    const hash = window.location.hash;
    if (hash.includes('#/simulation/payment/')) {
      const linkId = hash.replace('#/simulation/payment/', '');
      if (linkId) {
        setSimulatedLinkId(linkId);
        setActiveTab('simulated_payment');
      }
    }
  };

  useEffect(() => {
    checkPendingApprovals();
    const interval = setInterval(checkPendingApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkPendingApprovals = async () => {
    try {
      const cases = await recoveryApi.getCases('PENDING_APPROVAL');
      setPendingApprovalsCount(cases.length);
    } catch (e) {
      // Ignore background error
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (window.location.hash.includes('#/simulation/payment/')) {
            window.location.hash = '';
          }
          setActiveTab(tab);
        }} 
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'dashboard' && (
          <DashboardPage 
            setActiveTab={setActiveTab} 
            setSelectedCaseId={setSelectedCaseId} 
          />
        )}
        {activeTab === 'cases' && (
          <CasesPage 
            setActiveTab={setActiveTab} 
            setSelectedCaseId={setSelectedCaseId} 
          />
        )}
        {activeTab === 'case_detail' && selectedCaseId && (
          <CaseDetailPage 
            caseId={selectedCaseId} 
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === 'simulation' && (
          <SimulationLabPage 
            setActiveTab={setActiveTab} 
            setSelectedCaseId={setSelectedCaseId} 
          />
        )}
        {activeTab === 'approvals' && <HumanApprovalsPage />}
        {activeTab === 'audit' && <AuditLogPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'simulated_payment' && simulatedLinkId && (
          <SimulatedPaymentPage 
            linkId={simulatedLinkId} 
            setActiveTab={setActiveTab}
            setSelectedCaseId={setSelectedCaseId}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 glass-panel mt-auto">
        <p>RecoverAI • Autonomous Revenue Recovery Engine</p>
      </footer>
    </div>
  );
}

export default App;
