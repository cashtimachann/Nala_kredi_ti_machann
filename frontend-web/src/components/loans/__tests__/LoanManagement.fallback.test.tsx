import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoanManagement from '../LoanManagement';
import { microcreditLoanApplicationService } from '../../../services/microcreditLoanApplicationService';

describe('LoanManagement fallback behavior', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (microcreditLoanApplicationService as any).isAuthenticated = jest.fn(() => true) as any;
  });

  it('shows borrower name if customerName is not present on application', async () => {
      const applicationsPage = {
        applications: [
          {
            id: 'app-1',
            applicationNumber: 'APP-001',
            loanType: 'PERSONAL',
            borrower: { firstName: 'Borrower', lastName: 'Fallback', accountNumber: 'B-1' },
            customerName: null,
            branchId: 2,
            branchName: 'Ignored Branch Name',
            interestRate: 0.15,
            status: 'Draft',
            createdAt: new Date().toISOString()
          }
        ],
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
        pageSize: 10
      };

  (microcreditLoanApplicationService as any).getApplicationsPage = jest.fn().mockResolvedValue(applicationsPage);
  (microcreditLoanApplicationService as any).getBranches = jest.fn().mockResolvedValue([{ id: 2, name: 'Main Branch' }]);
  // Prevent dashboard calls from making network requests during the test
  (microcreditLoanApplicationService as any).getActiveLoans = jest.fn(async () => ([])) as any;
  (microcreditLoanApplicationService as any).getApprovedLoans = jest.fn(async () => ([])) as any;
  (microcreditLoanApplicationService as any).getAgentPerformance = jest.fn(async () => ([])) as any;
  (microcreditLoanApplicationService as any).getDashboardStats = jest.fn(async () => ({})) as any;
  (microcreditLoanApplicationService as any).getPortfolioTrend = jest.fn(async () => ([])) as any;

  render(<LoanManagement />);

    // Wait for page to load
  // Click the applications tab (Nouvelles Demandes) to load applications
  const applicationsTab = await waitFor(() => screen.getByText(/Nouvelles Demandes/i));
  fireEvent.click(applicationsTab);

  await waitFor(() => expect(microcreditLoanApplicationService.getApplicationsPage).toHaveBeenCalled());

  // The UI should show the borrower's fallback name
  await screen.findByText('Borrower Fallback');
  expect(screen.getByText('Borrower Fallback')).toBeInTheDocument();
  });
});
