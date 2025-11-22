import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoanDetails from '../LoanDetails';
import { microcreditLoanApplicationService } from '../../../services/microcreditLoanApplicationService';

const mockLoan = {
  id: 'loan-1',
  loanNumber: 'LN-1',
  customerId: 'cust-1',
  customerName: 'Test Borrower',
  loanType: 'PERSONAL',
  principalAmount: 1000,
  interestRate: 2.5,
  termMonths: 12,
  monthlyPayment: 100,
  disbursementDate: null,
  maturityDate: null,
  remainingBalance: 1000,
  paidAmount: 0,
  status: 'PENDING',
  currency: 'HTG',
  branch: 'Main Branch',
  loanOfficer: 'Officer',
  createdAt: new Date().toISOString(),
  applicationId: 'app-123'
} as any;

describe('LoanDetails - Documents', () => {
  it('should fetch and display application documents when applicationId present', async () => {
    const docs = [
      { id: 'doc-1', name: 'ID Card', description: 'CIN', filePath: 'path', fileSize: 1024, mimeType: 'application/pdf', uploadedAt: new Date().toISOString(), uploadedBy: 'user1', verified: true } as any
    ];

    (microcreditLoanApplicationService.getDocuments as jest.Mock) = jest.fn(async (applicationId: string) => docs) as any;
    (microcreditLoanApplicationService.downloadDocument as jest.Mock) = jest.fn(async (applicationId: string, documentId: string) => new Blob(['test'], { type: 'application/pdf' })) as any;

    const onClose = jest.fn();
    render(<LoanDetails loan={mockLoan} onClose={onClose} />);
    // switch to documents tab
    const tab = await waitFor(() => screen.getByText(/Documents/i));
    fireEvent.click(tab);

    await waitFor(() => expect(microcreditLoanApplicationService.getDocuments).toHaveBeenCalledWith('app-123'));
    expect(await screen.findByText(/ID Card/)).toBeTruthy();
  });
});

export {};
