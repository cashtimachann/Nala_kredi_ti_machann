import { getGuaranteePercentage } from '../loanTypeHelpers';
import { LoanType } from '../../types/microcredit';

describe('getGuaranteePercentage', () => {
  it('returns 30% for CREDIT_AUTO', () => {
    expect(getGuaranteePercentage(LoanType.CREDIT_AUTO)).toBe(0.30);
  });

  it('returns 30% for CREDIT_MOTO', () => {
    expect(getGuaranteePercentage(LoanType.CREDIT_MOTO)).toBe(0.30);
  });

  it('returns 15% for other loan types', () => {
    expect(getGuaranteePercentage(LoanType.PERSONAL)).toBe(0.15);
    expect(getGuaranteePercentage(LoanType.COMMERCIAL)).toBe(0.15);
    expect(getGuaranteePercentage(LoanType.AGRICULTURAL)).toBe(0.15);
    expect(getGuaranteePercentage(LoanType.CREDIT_PERSONNEL)).toBe(0.15);
  });
});