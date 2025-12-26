import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/auth/Login';
import CashierDashboard from './components/dashboards/CashierDashboard';
import SecretaryDashboard from './components/dashboards/SecretaryDashboard';
import CreditAgentDashboard from './components/dashboards/CreditAgentDashboard';
import BranchSupervisorDashboard from './components/dashboards/BranchSupervisorDashboard';
import RegionalManagerDashboard from './components/dashboards/RegionalManagerDashboard';
import SystemAdminDashboard from './components/dashboards/SystemAdminDashboard';
import AccountingDashboard from './components/dashboards/AccountingDashboard';
import SuperAdminDashboard from './components/dashboards/SuperAdminDashboard';
import Layout from './components/layout/Layout';
import EmployeeManagement from './components/payroll/EmployeeManagement';
import BranchReportDashboard from './components/reports/BranchReportDashboard';
import SuperAdminReportDashboard from './components/reports/SuperAdminDashboard';
import TransactionAudit from './components/reports/TransactionAudit';
import BranchPerformanceComparison from './components/reports/BranchPerformanceComparison';
import PayrollManagement from './components/payroll/PayrollManagement';
import ExchangeRateManagement from './components/currency-exchange/ExchangeRateManagement';
import BranchManagement from './components/branches/BranchManagement';
import InterBranchTransferList from './components/branches/InterBranchTransferList';
import ErrorBoundary from './components/common/ErrorBoundary';
import ConsolidatedTransferReport from './components/branches/ConsolidatedTransferReport';
import SavingsManagement from './components/savings/SavingsManagement';
import ClientAccountManagement from './components/admin/ClientAccountManagement';
import CurrentAccountManagement from './components/admin/CurrentAccountManagement';
import CurrentAccountTransactions from './components/admin/CurrentAccountTransactions';
import CurrentAccountReports from './components/admin/CurrentAccountReports';
import TermSavingsManagement from './components/admin/TermSavingsManagement';
import LoanManagement from './components/loans/LoanManagement';
import AdminAccountList from './components/admin/AdminAccountList';
import SuperAdminCashManagement from './components/admin/SuperAdminCashManagement';
import ClientCreatePage from './pages/ClientCreatePage';
import { UserInfo } from './services';
import apiService from './services/apiService';
import { useAuthStore } from './stores/authStore';
import GlobalLoadingOverlay from './components/common/GlobalLoadingOverlay';
import AppErrorBoundary from './components/common/AppErrorBoundary';

function App() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (userData: UserInfo, token: string) => {
    setAuth(userData, token);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };

  const getDashboardComponent = (role: string) => {
    // Debug: log the role to see what we're getting
    console.log('User role:', role, 'Type:', typeof role);
    
    switch (role) {
      case 'Cashier':
        return <CashierDashboard />;
      case 'Secretary':
      case 'AdministrativeSecretary':
        return <SecretaryDashboard />;
      case 'CreditAgent':
        return <CreditAgentDashboard />;
      case 'Manager':
        // Managers use the same dashboard view as Branch Supervisors
        return <BranchSupervisorDashboard />;
      case 'BranchSupervisor':
        return <BranchSupervisorDashboard />;
      case 'RegionalManager':
        return <RegionalManagerDashboard />;
      case 'SystemAdmin':
        return <SystemAdminDashboard />;
      case 'Accounting':
      case 'Management':
        return <AccountingDashboard />;
      case 'SuperAdmin':
        return <SuperAdminDashboard />;
      default:
        return (
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Rôle non reconnu</h1>
            <p className="text-gray-600">Rôle reçu: "{role}"</p>
            <p className="text-sm text-gray-500 mt-2">Veuillez contacter l'administrateur système.</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <AppErrorBoundary>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        <GlobalLoadingOverlay />

        <Routes>
          <Route 
            path="/login" 
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />

          <Route
            path="/dashboard"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  {getDashboardComponent(user.role)}
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Payroll Routes */}
          <Route
            path="/payroll"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <PayrollManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/payroll/employees"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <EmployeeManagement branchId={user.branchId?.toString()} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Currency Exchange Routes */}
          <Route
            path="/currency-exchange/rates"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ExchangeRateManagement branchId={user.branchId?.toString()} userRole={user.role} />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Branch Management Routes */}
          <Route
            path="/branches"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <BranchManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Cash Management Route (SuperAdmin) */}
          <Route
            path="/cash-management"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <SuperAdminCashManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Inter-Branch Transfer Routes */}
          <Route
            path="/transfers"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ErrorBoundary>
                    <InterBranchTransferList />
                  </ErrorBoundary>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/transfers/reports"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ErrorBoundary>
                    <ConsolidatedTransferReport />
                  </ErrorBoundary>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Savings Management Routes */}
          <Route
            path="/savings"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <SavingsManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Client Accounts Management Routes */}
          <Route
            path="/client-accounts"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ClientAccountManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Current Accounts Route */}
          <Route
            path="/current-accounts"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CurrentAccountManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Term Savings Route */}
          <Route
            path="/term-savings"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <TermSavingsManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Current Account Transactions Route */}
          <Route
            path="/current-accounts/transactions"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CurrentAccountTransactions />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Current Account Reports Route */}
          <Route
            path="/current-accounts/reports"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CurrentAccountReports />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Transactions Route (General) */}
          <Route
            path="/transactions"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CurrentAccountTransactions />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Reports Route (General) */}
          <Route
            path="/reports"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <CurrentAccountReports />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Branch Reports Routes */}
          <Route
            path="/reports/branch"
            element={
              user && ['Manager', 'BranchSupervisor', 'SuperAdmin', 'Director', 'Cashier'].includes(user.role) ? (
                <Layout user={user} onLogout={handleLogout}>
                  <BranchReportDashboard userRole={user.role} branchId={user.branchId} />
                </Layout>
              ) : user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* SuperAdmin Reports Routes */}
          <Route
            path="/admin/reports/dashboard"
            element={
              user && ['SuperAdmin', 'Director'].includes(user.role) ? (
                <Layout user={user} onLogout={handleLogout}>
                  <SuperAdminReportDashboard />
                </Layout>
              ) : user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/admin/reports/audit"
            element={
              user && ['SuperAdmin', 'Director'].includes(user.role) ? (
                <Layout user={user} onLogout={handleLogout}>
                  <TransactionAudit />
                </Layout>
              ) : user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/admin/reports/performance"
            element={
              user && ['SuperAdmin', 'Director'].includes(user.role) ? (
                <Layout user={user} onLogout={handleLogout}>
                  <BranchPerformanceComparison />
                </Layout>
              ) : user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Loans Routes */}
          <Route
            path="/loans"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <LoanManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/microfinance"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <LoanManagement />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Admin Accounts Route */}
          <Route
            path="/admin/accounts"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <AdminAccountList />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Client Creation Route */}
          <Route
            path="/clients/new"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <ClientCreatePage />
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Settings Route */}
          <Route
            path="/settings"
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Paramètres du Système</h1>
                    <p className="text-gray-600">Les paramètres de configuration seront bientôt disponibles.</p>
                  </div>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route 
            path="/" 
            element={
              <Navigate to={user ? "/dashboard" : "/login"} replace />
            } 
          />

          {/* Catch all route */}
          <Route 
            path="*" 
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout}>
                  <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Page non trouvée</h1>
                    <p className="text-gray-600">La page que vous recherchez n'existe pas.</p>
                  </div>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
      </AppErrorBoundary>
    </Router>
  );
}

export default App;