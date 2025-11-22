import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import LoanDetails from '../LoanDetails';
import { microcreditLoanService } from '../../../services/microcreditLoanService';

const mockLoan = {
  id: 'loan-1',
  loanNumber: 'LN-1',
  customerId: 'cust-1',
  customerName: 'Test Borrower',
  loanType: 'PERSONAL',
  principalAmount: 1000,
  interestRate: 12, // 12% annual
  monthlyInterestRate: 1.0, // 1% monthly
  termMonths: 12,
  monthlyPayment: 0,
  disbursementDate: '2025-01-01',
  maturityDate: null,
  remainingBalance: 1000,
  paidAmount: 0,
  status: 'ACTIVE',
  currency: 'HTG',
  branch: 'Main Branch',
  loanOfficer: 'Officer',
  createdAt: new Date().toISOString(),
  loanRecordId: 'loan-1'
} as any;

describe('LoanDetails - Calendrier', () => {
  it('computes interest and total per installment from monthly interest rate when backend returns only principal', async () => {
    const schedule = [
      { installmentNumber: 1, dueDate: '2025-02-01', principalAmount: 90, status: 'PENDING' },
      { installmentNumber: 2, dueDate: '2025-03-01', principalAmount: 91, status: 'PENDING' }
    ];

    (microcreditLoanService.getPaymentSchedule as jest.Mock) = jest.fn(async (loanId: string) => schedule) as any;

    render(<LoanDetails loan={mockLoan} onClose={() => {}} />);

    // Click the schedule tab
    const scheduleTab = await waitFor(() => screen.getByText(/Calendrier/i));
    fireEvent.click(scheduleTab);

    await waitFor(() => expect(microcreditLoanService.getPaymentSchedule).toHaveBeenCalledWith('loan-1'));

    // Validate computed interest for first installment: remainingBalance 1000 * 1% = 10 HTG
    const firstRow = await waitFor(() => screen.getByText('1').closest('tr'));
    const rowScope = within(firstRow as HTMLElement);
    expect(rowScope.getByText(/10 HTG/)).toBeTruthy();

    // Validate total = principal + interest -> 90 + 10 = 100 HTG
    expect(rowScope.getByText(/100 HTG/)).toBeTruthy();
  });
});

export {};
