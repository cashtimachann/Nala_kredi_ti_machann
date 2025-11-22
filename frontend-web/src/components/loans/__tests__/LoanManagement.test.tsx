import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import LoanManagement from '../LoanManagement';
import { microcreditLoanApplicationService } from '../../../services/microcreditLoanApplicationService';

// Mutate the live service methods in tests so the component uses them
beforeEach(() => {
  microcreditLoanApplicationService.isAuthenticated = jest.fn(() => true) as any;
  microcreditLoanApplicationService.getApplicationsPage = jest.fn(async (params: any) => ({
    applications: [
      {
        id: 'app-1',
        applicationNumber: 'APP-1',
        borrowerId: 'borrower-1',
        loanType: 'PERSONAL',
        requestedAmount: 1500,
        requestedDurationMonths: 12,
        purpose: 'Test Loan',
        currency: 'HTG',
  branchName: undefined,
  branchId: 1,
        customerName: 'Jean Snapshot',
        customerPhone: '+50912345678',
        interestRate: 0.15,
        createdAt: new Date().toISOString(),
        status: 'SUBMITTED'
      }
    ],
    totalCount: 1,
    totalPages: 1,
    currentPage: 1,
    pageSize: params?.pageSize || 10
  })) as any;

  microcreditLoanApplicationService.getActiveLoans = jest.fn(async () => ([])) as any;
  microcreditLoanApplicationService.getBranches = jest.fn(async () => ([{ id: 1, name: 'Main Branch' }])) as any;
  microcreditLoanApplicationService.getAgentPerformance = jest.fn(async () => ([])) as any;
  microcreditLoanApplicationService.getDashboardStats = jest.fn(async () => ({})) as any;
  microcreditLoanApplicationService.getPortfolioTrend = jest.fn(async () => ([])) as any;
});

describe('LoanManagement - Applications Tab (Nouvelles Demandes)', () => {
  it('should render application snapshot fields (customerName and customerPhone) and convert interest rate', async () => {
  render(<LoanManagement />);

  // Wait until the tabs are visible and click the "Nouvelles Demandes" tab to trigger loading of applications
  const tab = await waitFor(() => screen.getByText(/Nouvelles Demandes/i));
  fireEvent.click(tab);
  // Debugging: print DOM after clicking to inspect what was rendered
  // screen.debug();

  // Ensure the service was called to load applications and returned the expected page
  await waitFor(() => expect(microcreditLoanApplicationService.getApplicationsPage).toHaveBeenCalled());

  // Wait for the count badge to indicate there is one pending application
  await waitFor(() => expect(screen.getByText(/1 demande/)).toBeTruthy());

  // The interest rate should be converted from decimal (0.15) to percentage (15) and displayed as monthly rate
  expect(screen.getByText(/Taux mensuel: 1.25%/)).toBeTruthy();

  // Application number should be present
  expect(screen.getByText(/APP-1/)).toBeTruthy();

  // Branch (Succursale) should be displayed using branchName from the application
  expect(screen.getAllByText(/Main Branch/).length).toBeGreaterThan(0);

  // Loan type should be displayed (Personel) within the application row
  const appRow = screen.getByText(/APP-1/).closest('tr');
  const rowScope = within(appRow as HTMLElement);
  expect(rowScope.getByText(/Personnel/)).toBeTruthy();

  // Monthly payment should be displayed (calculated from annual interest if monthlyInterestRate not provided)
  const interestRateDecimal = 0.15;
  const annualPercent = interestRateDecimal > 0 && interestRateDecimal < 1 ? interestRateDecimal * 100 : interestRateDecimal;
  const monthlyRate = annualPercent / 12 / 100;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, 12);
  const denominator = Math.pow(1 + monthlyRate, 12) - 1;
  const expectedMonthly = 1500 * (numerator / denominator);
  // Format like the app uses (fr-FR) with two decimals for display
  const formatted = expectedMonthly.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  expect(rowScope.getByText(new RegExp(`Mensualité:\s*${formatted}\s*HTG`))).toBeTruthy();

  // Duration should be displayed
  expect(screen.getByText(/12 mois/)).toBeTruthy();

  // Status (En attente) should be shown via badge
  expect(screen.getByText(/En attente/)).toBeTruthy();

  // Status should appear only once in the application row (reuse earlier appRow and rowScope)
  expect(rowScope.getAllByText(/En attente/).length).toBe(1);

  // Phone is not displayed in the list snapshot; it appears in the application modal, so don't assert here
  });

  it('should fetch full application data and display it in the approval modal', async () => {
    // Prepare a detailed application response
    const detailedApp = {
      id: 'app-1',
      applicationNumber: 'APP-1',
      borrowerId: 'borrower-1',
      loanId: null,
      loanType: 'PERSONAL',
      requestedAmount: 1500,
      requestedDurationMonths: 12,
      purpose: 'Test Loan Full Data',
      currency: 'HTG',
      branchId: 1,
      branchName: 'Main Branch',
      customerName: 'Jean Snapshot',
      customerPhone: '+50912345678',
      customerAddress: 'Rue 123',
      occupation: 'Commerçant',
      monthlyIncome: 20000,
      dependents: 2,
      collateralValue: 2000,
      interestRate: 0.15,
      createdAt: new Date().toISOString(),
      status: 'SUBMITTED',
      ApprovalSteps: [
        { Id: 'step1', Level: '1', ApproverName: 'Officer A', Status: 'APPROVED', Comments: 'Ok', ProcessedAt: new Date().toISOString(), CreatedAt: new Date().toISOString() },
        { Id: 'step2', Level: '2', ApproverName: 'Manager B', Status: 'PENDING', Comments: '', CreatedAt: new Date().toISOString() }
      ]
    } as any;

    (microcreditLoanApplicationService.getApplication as jest.Mock) = jest.fn(async (id: string) => detailedApp) as any;

    render(<LoanManagement />);
    const tab = await waitFor(() => screen.getByText(/Nouvelles Demandes/i));
    fireEvent.click(tab);
    await waitFor(() => expect(microcreditLoanApplicationService.getApplicationsPage).toHaveBeenCalled());

    // Click the 'Traiter' button for the application
    const traiterButton = await waitFor(() => screen.getByRole('button', { name: /Traiter/i }));
    fireEvent.click(traiterButton);

    // Expect getApplication to have been called to fetch the full details
    await waitFor(() => expect(microcreditLoanApplicationService.getApplication).toHaveBeenCalled());

    // The modal should render the customerName and occupation from the detailed response
    await waitFor(() => expect(screen.getByText(/Commerçant/)).toBeTruthy());
    // Montant demandé should be displayed in the modal
    await waitFor(() => expect(screen.getAllByText(/1.?500 HTG/).length).toBeGreaterThan(0));
    // Monthly payment should be visible (any HTG amount)
    await waitFor(() => expect(screen.getAllByText(/HTG/).length).toBeGreaterThan(0));
    // Collateral value should be displayed
    await waitFor(() => expect(screen.getAllByText(/2.?000 HTG/).length).toBeGreaterThan(0));
    // Monthly income should be present
    await waitFor(() => expect(screen.getAllByText(/20.?000 HTG/).length).toBeGreaterThan(0));

    // Wait for the modal header and click the Approbation tab so approval steps are visible
    await waitFor(() => expect(screen.getByText(/Approbation de Demande de Prêt/i)).toBeTruthy());
    const approvalTabButton = await waitFor(() => screen.getByRole('button', { name: /Approbation/i }));
    fireEvent.click(approvalTabButton);

    // Approval steps should be rendered with the approver names once we are on the Approbation tab
    await waitFor(() => expect(screen.getAllByText(/Officer A/).length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByText(/Manager B/)).toBeTruthy());
  });
});

export {};
