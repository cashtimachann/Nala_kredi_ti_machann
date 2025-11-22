import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoanManagement from '../LoanManagement';
import { microcreditLoanApplicationService } from '../../../services/microcreditLoanApplicationService';

beforeEach(() => {
  jest.resetAllMocks();
  (microcreditLoanApplicationService as any).isAuthenticated = jest.fn(() => true) as any;
});

describe('LoanManagement - Disbursement Tab (À Décaisser)', () => {
  it('should show approved application in disbursement tab with branch mapped', async () => {
    (microcreditLoanApplicationService as any).getActiveLoans = jest.fn(async () => ([])) as any;

    const approvedApps = [
      {
        id: 'app-approved-1',
        applicationNumber: 'APP-APP-1',
        loanType: 'PERSONAL',
        requestedAmount: 1500,
        requestedDurationMonths: 12,
        interestRate: 0.12,
        borrower: { firstName: 'Benoit', lastName: 'Approved', accountNumber: 'BK-1' },
        branchId: 7,
        branchName: 'Ignored Branch',
  status: 'APPROVED',
        monthlyInterestRate: 1.25, // monthly percent (1.25% per month)
        createdAt: new Date().toISOString()
      }
    ];

    (microcreditLoanApplicationService as any).getApprovedLoans = jest.fn(async () => approvedApps) as any;
    (microcreditLoanApplicationService as any).getBranches = jest.fn(async () => ([{ id: 7, name: 'North Branch' }])) as any;
    (microcreditLoanApplicationService as any).getApplicationsPage = jest.fn(async () => ({ applications: [], totalCount: 0, totalPages: 1, currentPage: 1, pageSize: 10 })) as any;
    (microcreditLoanApplicationService as any).getAgentPerformance = jest.fn(async () => ([])) as any;
    (microcreditLoanApplicationService as any).getDashboardStats = jest.fn(async () => ({})) as any;
    (microcreditLoanApplicationService as any).getPortfolioTrend = jest.fn(async () => ([])) as any;
    (microcreditLoanApplicationService as any).getLoanIdForApplication = jest.fn(async (id: string) => null) as any;

    render(<LoanManagement />);

    // Click the disbursement tab
  const disburseTabs = await waitFor(() => screen.getAllByText(/À Décaisser/i));
  fireEvent.click(disburseTabs[0]);

    // Wait for approved applications to be loaded
    await waitFor(() => expect(microcreditLoanApplicationService.getApprovedLoans).toHaveBeenCalled());

  // Debug DOM to investigate why loan isn't shown
  // screen.debug();

  // The page should display the loan number and branch name from branches lookup
  const appCell = await screen.findByText('APP-APP-1');
  const appRow = appCell.closest('tr') as HTMLElement;
  expect(appRow).toBeTruthy();
  expect(within(appRow).getByText(/North Branch/)).toBeInTheDocument();

  // Click View details and assert modal content
    const viewButton = screen.getByRole('button', { name: /Voir|Détails|Details/i });
  fireEvent.click(viewButton);

  // Modal should show interest rate (annual) and monthly rate; query inside the modal to avoid matching page header
  // The title may exist in multiple places; find the last one which is inside the modal
  const headers = await waitFor(() => screen.getAllByText(/Détails du Prêt/i));
  const modalHeader = headers[headers.length - 1];
  const modal = modalHeader.closest('div');
  expect(modal).toBeTruthy();
  const modalScope = within(modal as HTMLElement);
  await waitFor(() => expect(modalScope.getByText(/Taux d'Intérêt \(annuel\):/i)).toBeTruthy());
  expect(modalScope.getByText(/Taux mensuel:/i)).toBeTruthy();

  // Monthly payment must be computed from monthlyInterestRate (1.25% monthly)
  const principal = 1500;
  const months = 12;
  const monthlyRate = 1.25 / 100;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  const expectedMonthlyPayment = principal * (numerator / denominator);
  const formattedPayment = expectedMonthlyPayment.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const expectedText = `${formattedPayment} HTG`;
  await waitFor(() => expect(modalScope.getAllByText(new RegExp(expectedText)).length).toBeGreaterThan(0));

  // Click the 'Débourser' button and check the modal displays the interest rate correctly as percent
  const debourseBtn = await waitFor(() => screen.getByRole('button', { name: /Débourser|Débourser/i }));
  fireEvent.click(debourseBtn);
  // The modal shows the interest as a percentage (annual), expect 12.00%
  await screen.findByText(/12.00%/);
  });

  it('should NOT show an application in disbursement tab if it is already linked to an active loan', async () => {
    // Simulate an active loan that references the approved application id
    const activeLoans = [
      {
        id: 'loan-active-1',
        applicationId: 'app-approved-1',
        loanNumber: 'ML-2025-0001',
        borrowerName: 'Benoit Approved',
        status: 'Active',
        principalAmount: 1500,
        currency: 'HTG',
        createdAt: new Date().toISOString()
      }
    ];

    (microcreditLoanApplicationService as any).getActiveLoans = jest.fn(async () => activeLoans) as any;

    const approvedApps = [
      {
        id: 'app-approved-1',
        applicationNumber: 'APP-APP-1',
        loanType: 'PERSONAL',
        requestedAmount: 1500,
        requestedDurationMonths: 12,
        interestRate: 0.12,
        borrower: { firstName: 'Benoit', lastName: 'Approved', accountNumber: 'BK-1' },
        branchId: 7,
        branchName: 'Ignored Branch',
        status: 'APPROVED',
        monthlyInterestRate: 1.25,
        createdAt: new Date().toISOString()
      }
    ];

    (microcreditLoanApplicationService as any).getApprovedLoans = jest.fn(async () => approvedApps) as any;
    (microcreditLoanApplicationService as any).getBranches = jest.fn(async () => ([{ id: 7, name: 'North Branch' }])) as any;

    render(<LoanManagement />);

    // Click the disbursement tab
    const disburseTabs = await waitFor(() => screen.getAllByText(/À Décaisser/i));
    fireEvent.click(disburseTabs[0]);

    // Wait for calls
    await waitFor(() => expect(microcreditLoanApplicationService.getApprovedLoans).toHaveBeenCalled());

    // The approved application should not be present because it's linked to an active loan
    expect(screen.queryByText('APP-APP-1')).toBeNull();
  });
});

function within(container: HTMLElement) {
  return {
    getByText: (matcher: RegExp | string) => {
      const elements = Array.from(container.querySelectorAll('*'));
      const found = elements.find(el => {
        const text = el.textContent || '';
        return typeof matcher === 'string' ? text.includes(matcher) : matcher.test(text);
      });
      if (!found) throw new Error(`Unable to find text: ${matcher}`);
      return found as HTMLElement;
    },
    getAllByText: (matcher: RegExp | string) => {
      const elements = Array.from(container.querySelectorAll('*'));
      return elements.filter(el => {
        const text = el.textContent || '';
        return typeof matcher === 'string' ? text.includes(matcher) : matcher.test(text);
      }) as HTMLElement[];
    }
  };
}

