import { calculateMonthlyPaymentFromMonthlyRate, roundCurrency, generateAmortizationSchedule } from '../loanRateUtils';

describe('loanRateUtils - monthly payment & amortization', () => {
  it('returns principal/term when monthly rate is zero', () => {
    const principal = 1200;
    const term = 12;
    const monthly = calculateMonthlyPaymentFromMonthlyRate(principal, 0, term);
    expect(monthly).toBe(roundCurrency(principal / term));
  });

  it('calculates non-zero monthly payment and produces full amortization', () => {
    const principal = 1000;
    const monthlyRatePercent = 1; // 1% monthly
    const term = 12;

    const monthly = calculateMonthlyPaymentFromMonthlyRate(principal, monthlyRatePercent, term);
    // Monthly must be positive and less than principal for these params
    expect(monthly).toBeGreaterThan(0);
    expect(monthly).toBeLessThan(principal);

    // Run amortization using the exact formulas you provided
    let balance = roundCurrency(principal);
    const r = monthlyRatePercent / 100;
    let totalPrincipal = 0;
    let totalInterest = 0;

    for (let i = 1; i <= term; i++) {
      const interest = roundCurrency(balance * r); // interest this month
      let capital = roundCurrency(monthly - interest); // principal part

      // last installment adjustment (carry remaining balance)
      if (i === term && capital < balance) {
        capital = roundCurrency(balance);
      }

      // Do not over-pay principal
      if (capital > balance) capital = roundCurrency(balance);

      balance = roundCurrency(Math.max(0, balance - capital));

      totalPrincipal += capital;
      totalInterest += interest;
    }

    // After full amortization term balance should be zero
    expect(balance).toBe(0);

    // Total principal repaid should equal original principal
    expect(roundCurrency(totalPrincipal)).toBe(roundCurrency(principal));

    // Total interest should equal (monthly * term) - principal (by definition)
    const computedInterest = roundCurrency(monthly * term - principal);
    // cumulative rounding can introduce a 1 cent delta — accept up to 1 cent difference
    const diff = roundCurrency(Math.abs(roundCurrency(totalInterest) - computedInterest));
    expect(diff).toBeLessThanOrEqual(0.01);
  });

  it('matches example amortization for 100000 HTG, 3.5% monthly, 3 months', () => {
    const principal = 100000;
    const monthlyRatePercent = 3.5;
    const months = 3;

    const schedule = generateAmortizationSchedule(principal, monthlyRatePercent, months);

    // Should produce 3 rows and fully amortize to zero
    expect(schedule.length).toBe(3);

    const monthly = roundCurrency(calculateMonthlyPaymentFromMonthlyRate(principal, monthlyRatePercent, months));
    const r = monthlyRatePercent / 100;

    // First row checks
    expect(schedule[0].startingBalance).toBe(principal);
    const interest0 = roundCurrency(principal * r);
    expect(schedule[0].interest).toBe(interest0);
    expect(schedule[0].payment).toBe(monthly);
    expect(schedule[0].principalPayment).toBe(roundCurrency(monthly - interest0));

    // Verify each row's consistency and final balance 0
    let runningBalance = roundCurrency(principal);
    for (let i = 0; i < schedule.length; i++) {
      const row = schedule[i];
      const expectedInterest = roundCurrency(runningBalance * r);
      expect(row.interest).toBe(expectedInterest);

      if (i === schedule.length - 1) {
        // last principal should clear full remaining balance
        expect(row.principalPayment).toBe(roundCurrency(runningBalance));
        expect(row.endingBalance).toBe(0);
        expect(row.payment).toBe(roundCurrency(row.principalPayment + row.interest));
      } else {
        expect(row.payment).toBe(monthly);
        expect(row.principalPayment).toBe(roundCurrency(row.payment - row.interest));
        const nextBalance = roundCurrency(Math.max(0, runningBalance - row.principalPayment));
        expect(row.endingBalance).toBe(nextBalance);
        runningBalance = nextBalance;
      }
    }
  });
});
