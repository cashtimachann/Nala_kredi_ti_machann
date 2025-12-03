import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import BranchReportDashboard from '../BranchReportDashboard';
import { branchReportService } from '../../../services/branchReportService';

// Sample backend-shaped daily report
const sampleDailyReport = {
  reportDate: '2025-12-02T00:00:00.000Z',
  branchId: 42,
  branchName: 'Succursale Test',
  branchRegion: 'Nord',
  creditsDisbursed: [],
  paymentsReceived: [],
  deposits: [],
  withdrawals: [],
  totalCreditsDisbursedHTG: 15000,
  totalCreditsDisbursedUSD: 500,
  creditsDisbursedCount: 3,
  totalPaymentsReceivedHTG: 8000,
  totalPaymentsReceivedUSD: 350,
  paymentsReceivedCount: 10,
  totalDepositsHTG: 12000,
  totalDepositsUSD: 0,
  depositsCount: 5,
  totalWithdrawalsHTG: 2000,
  totalWithdrawalsUSD: 0,
  withdrawalsCount: 2,
  cashBalance: {
    openingBalanceHTG: 10000,
    openingBalanceUSD: 0,
    closingBalanceHTG: 15000,
    closingBalanceUSD: 0,
    netChangeHTG: 5000,
    netChangeUSD: 0,
    cashSessions: []
  },
  totalTransactions: 20,
  activeCashSessions: 1,
  completedCashSessions: 2
};

describe('BranchReportDashboard (daily) - mapping tests', () => {
  beforeEach(() => {
    jest.spyOn(branchReportService, 'getMyBranchDailyReport').mockResolvedValue(sampleDailyReport);
    // Make formatCurrency predictable
    jest.spyOn(branchReportService, 'formatCurrency').mockImplementation((amount:number, cur:any) => `${amount} ${cur}`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders branch name and totals using backend JSON shape', async () => {
    render(<BranchReportDashboard userRole={'Manager'} />);

    // branch name should show
    expect(await screen.findByText('Succursale Test')).toBeInTheDocument();

    // Totals should be rendered using the backend total* properties
    await waitFor(async () => {
      const creditMatches = await screen.findAllByText('15000 HTG');
      expect(creditMatches.length).toBeGreaterThan(0);

      const paymentMatches = await screen.findAllByText('8000 HTG');
      expect(paymentMatches.length).toBeGreaterThan(0);
    });
  });

  test('SuperAdmin can view a specific branch daily report (getDailyReportByBranch)', async () => {
    jest.spyOn(branchReportService, 'getDailyReportByBranch').mockResolvedValue(sampleDailyReport as any);

    render(<BranchReportDashboard userRole={'SuperAdmin'} branchId={42} />);

    expect(await screen.findByText('Succursale Test')).toBeInTheDocument();

    await waitFor(async () => {
      const creditMatches = await screen.findAllByText('15000 HTG');
      expect(creditMatches.length).toBeGreaterThan(0);
    });
  });
});
