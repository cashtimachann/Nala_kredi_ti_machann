import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RecouvrementModal from '../RecouvrementModal';
import { microcreditLoanService } from '../../../services/microcreditLoanService';

jest.mock('../../../services/microcreditLoanService');

describe('RecouvrementModal', () => {
  const loan = {
    id: 'loan-1',
    loanNumber: 'L-001',
    customerName: 'John Doe',
    remainingBalance: 1000,
    currency: 'HTG',
    daysOverdue: 5,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and displays no notes when none exist', async () => {
    (microcreditLoanService.getCollectionNotes as jest.Mock).mockResolvedValue([]);

    render(<RecouvrementModal loan={loan} onClose={() => {}} />);

    // Switch to notes tab
    fireEvent.click(screen.getByRole('button', { name: /Notes/i }));

    expect(microcreditLoanService.getCollectionNotes).toHaveBeenCalledWith('loan-1');

    await waitFor(() => {
      expect(screen.getByText(/Aucune note de recouvrement enregistrée/i)).toBeInTheDocument();
    });
  });

  it('saves a note and displays it in the list', async () => {
    (microcreditLoanService.getCollectionNotes as jest.Mock).mockResolvedValue([]);
    const createdNote = {
      id: 'note-1',
      loanId: 'loan-1',
      note: 'Promised to pay next week',
      createdBy: 'user-1',
      createdByName: 'Agent A',
      createdAt: new Date().toISOString(),
    };
    (microcreditLoanService.addCollectionNote as jest.Mock).mockResolvedValue(createdNote);

    render(<RecouvrementModal loan={loan} onClose={() => {}} />);

    // Open notes tab
    fireEvent.click(screen.getByRole('button', { name: /Notes/i }));

    // Enter note
    const textarea = screen.getByPlaceholderText(/Notes sur contact/i);
    fireEvent.change(textarea, { target: { value: 'Promised to pay next week' } });

    // Click save
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer la note/i }));

    await waitFor(() => expect(microcreditLoanService.addCollectionNote).toHaveBeenCalledWith('loan-1', 'Promised to pay next week'));

    // New note should appear
    await waitFor(() => expect(screen.getByText(/Promised to pay next week/i)).toBeInTheDocument());
  });
});
