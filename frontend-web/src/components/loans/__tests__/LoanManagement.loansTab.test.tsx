import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import LoanManagement from '../LoanManagement';
import { microcreditLoanApplicationService } from '../../../services/microcreditLoanApplicationService';

beforeEach(() => {
  jest.resetAllMocks();
  (microcreditLoanApplicationService as any).isAuthenticated = jest.fn(() => true) as any;
});

describe('LoanManagement - Loans Tab (Prêts Actifs)', () => {
  it('should show active loan with branch mapping and snapshot customer name', async () => {
    // Mock active loans with branchId and snapshot customerName
    (microcreditLoanApplicationService as any).getActiveLoans = jest.fn(async () => ([
      {
        id: 'loan-1',
        loanNumber: 'LOAN-1',
        loanType: 'PERSONAL',
        principalAmount: 2000,
        monthlyPayment: 200,
        termMonths: 12,
        interestRate: 15, // already percentage here
        remainingBalance: 2000,
        paidAmount: 0,
  status: 'Active',
        branchId: 3,
        branchName: 'Ignored',
        customer: { firstName: 'Alice', lastName: 'Loans', contact: { phone: '509-1112222' } },
        loanOfficerName: 'Officer'
      }
    ])) as any;

    // Approved loans list empty
    (microcreditLoanApplicationService as any).getApprovedLoans = jest.fn(async () => ([])) as any;
    (microcreditLoanApplicationService as any).getBranches = jest.fn(async () => ([{ id: 3, name: 'Cap-Haitien Branch' }])) as any;
    (microcreditLoanApplicationService as any).getApplicationsPage = jest.fn(async () => ({ applications: [], totalCount: 0, totalPages: 1, currentPage: 1, pageSize: 10 })) as any;

    render(<LoanManagement />);

    // Click the loans tab to load active loans
    const loansTab = await waitFor(() => screen.getByText(/Prêts Actifs/i));
    fireEvent.click(loansTab);

  await waitFor(() => expect(microcreditLoanApplicationService.getActiveLoans).toHaveBeenCalled());

  // Loan number presence
  await waitFor(() => expect(screen.getByText(/LOAN-1/)).toBeInTheDocument());

  // The UI shows customer name concatenated from customer object
  expect(screen.getByText(/Alice Loans/)).toBeInTheDocument();

    // Branch name should come from branches endpoint mapping — check inside the same row as the loan
    const loanRow = screen.getByText(/LOAN-1/).closest('tr') as HTMLElement;
    expect(loanRow).toBeTruthy();
    expect(within(loanRow).getByText(/Cap-Haitien Branch/)).toBeInTheDocument();

    // Loan number present
    expect(screen.getByText(/LOAN-1/)).toBeInTheDocument();
  });

  it('should support borrower object field as backend may use borrower instead of customer', async () => {
    (microcreditLoanApplicationService as any).getActiveLoans = jest.fn(async () => ([
      {
        id: 'loan-2',
        loanNumber: 'LOAN-2',
        loanType: 'PERSONAL',
        principalAmount: 1500,
        monthlyPayment: 125,
        termMonths: 12,
        interestRate: 12,
        remainingBalance: 1250,
        paidAmount: 250,
        status: 'Active',
        branchId: 5,
        borrower: { firstName: 'Bob', lastName: 'Borrower', contact: { phone: '509-3334444' } },
        loanOfficerName: 'Officer2'
      }
    ])) as any;

    (microcreditLoanApplicationService as any).getApprovedLoans = jest.fn(async () => ([])) as any;
    (microcreditLoanApplicationService as any).getBranches = jest.fn(async () => ([{ id: 5, name: 'Gonaives Branch' }])) as any;
    (microcreditLoanApplicationService as any).getApplicationsPage = jest.fn(async () => ({ applications: [], totalCount: 0, totalPages: 1, currentPage: 1, pageSize: 10 })) as any;

    render(<LoanManagement />);

    const loansTab = await waitFor(() => screen.getByText(/Prêts Actifs/i));
    fireEvent.click(loansTab);

    await waitFor(() => expect(microcreditLoanApplicationService.getActiveLoans).toHaveBeenCalled());

    await waitFor(() => expect(screen.getByText(/LOAN-2/)).toBeInTheDocument());
    expect(screen.getByText(/Bob Borrower/)).toBeInTheDocument();
    const loanRow2 = screen.getByText(/LOAN-2/).closest('tr') as HTMLElement;
    expect(loanRow2).toBeTruthy();
    expect(within(loanRow2).getByText(/Gonaives Branch/)).toBeInTheDocument();
    // Agent name should be displayed if loanOfficer is present
    expect(screen.getByText(/Agent: Officer2/)).toBeInTheDocument();
  });

  it('should not show approved but not-active loans in the loans tab', async () => {
    // Active loans include only LOAN-3
    (microcreditLoanApplicationService as any).getActiveLoans = jest.fn(async () => ([
      {
        id: 'loan-3',
        loanNumber: 'LOAN-3',
        loanType: 'PERSONAL',
        principalAmount: 2500,
        monthlyPayment: 200,
        termMonths: 12,
        interestRate: 10,
        remainingBalance: 2000,
        paidAmount: 500,
        status: 'Active',
        branchId: 9,
        customer: { firstName: 'Carol', lastName: 'Active', contact: { phone: '509-7778888' } },
        loanOfficerName: 'Officer-3'
      }
    ])) as any;

    // Approved apps contain LOAN-APP-1 which should NOT appear in loans tab
    (microcreditLoanApplicationService as any).getApprovedLoans = jest.fn(async () => ([
      {
        id: 'app-approved-2',
        applicationNumber: 'APP-APP-2',
        loanType: 'PERSONAL',
        requestedAmount: 1000,
        requestedDurationMonths: 6,
        status: 'APPROVED',
        borrower: { firstName: 'Denied', lastName: 'User' },
        branchId: 4,
        branchName: 'Ignored'
      }
    ])) as any;

    (microcreditLoanApplicationService as any).getBranches = jest.fn(async () => ([{ id: 9, name: 'South Branch' }])) as any;
    (microcreditLoanApplicationService as any).getApplicationsPage = jest.fn(async () => ({ applications: [], totalCount: 0, totalPages: 1, currentPage: 1, pageSize: 10 })) as any;

    render(<LoanManagement />);

    const loansTab = await waitFor(() => screen.getByText(/Prêts Actifs/i));
    fireEvent.click(loansTab);

    await waitFor(() => expect(microcreditLoanApplicationService.getActiveLoans).toHaveBeenCalled());

    // LOAN-3 should be present, app-approved-2 should NOT (it's approved only)
    await waitFor(() => expect(screen.getByText(/LOAN-3/)).toBeInTheDocument());
    expect(screen.queryByText(/APP-APP-2/)).toBeNull();
    // Ensure agent's name shown for active loan
    expect(screen.getByText(/Agent: Officer-3/)).toBeInTheDocument();
  });
});
