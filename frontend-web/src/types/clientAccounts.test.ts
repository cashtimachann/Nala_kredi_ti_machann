import { getMonthlyInterestRatePercent, TermSavingsType } from './clientAccounts';

test('computes monthly rate from annual fractional rate when no termType provided', () => {
  const monthly = getMonthlyInterestRatePercent({ interestRate: 0.045 });
  // 0.045 / 12 * 100 = 0.375
  expect(Number(monthly.toFixed(6))).toBeCloseTo(0.375, 6);
});

test('computes monthly rate from term fractional rate for 3-month term', () => {
  const monthly = getMonthlyInterestRatePercent({ interestRate: 0.025, termType: TermSavingsType.THREE_MONTHS });
  // 0.025 / 3 * 100 = 0.833333...
  expect(Number(monthly.toFixed(6))).toBeCloseTo(0.833333, 6);
});

test('uses interestRateMonthly when provided', () => {
  const monthly = getMonthlyInterestRatePercent({ interestRateMonthly: 0.015 });
  // 0.015 -> 1.5%
  expect(Number(monthly.toFixed(6))).toBeCloseTo(1.5, 6);
});

test('computes monthly from percent annual value', () => {
  const monthly = getMonthlyInterestRatePercent({ interestRate: 4.5 });
  // 4.5 / 12 = 0.375
  expect(Number(monthly.toFixed(6))).toBeCloseTo(0.375, 6);
});
