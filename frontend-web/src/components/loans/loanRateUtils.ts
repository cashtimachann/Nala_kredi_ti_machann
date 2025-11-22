export const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const normalizePercentValue = (value: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return 0;
  }
  return value < 1 ? value * 100 : value;
};

export const resolveMonthlyRatePercent = (
  monthlyRate?: number | null,
  annualRate?: number | null,
  defaultValue = 0
): number => {
  const normalizedMonthly = typeof monthlyRate === 'number' ? normalizePercentValue(monthlyRate) : 0;
  if (normalizedMonthly > 0) {
    return normalizedMonthly;
  }

  const normalizedAnnual = typeof annualRate === 'number' ? normalizePercentValue(annualRate) : 0;
  if (normalizedAnnual > 0) {
    // Always divide annual rate by 12 to get monthly rate
    return normalizedAnnual / 12;
  }

  return defaultValue;
};

export const resolveAnnualRatePercent = (
  monthlyRate?: number | null,
  annualRate?: number | null,
  defaultValue = 0
): number => {
  const normalizedAnnual = typeof annualRate === 'number' ? normalizePercentValue(annualRate) : 0;
  if (normalizedAnnual > 12) {
    return normalizedAnnual;
  }

  const normalizedMonthly = typeof monthlyRate === 'number' ? normalizePercentValue(monthlyRate) : 0;
  if (normalizedMonthly > 0) {
    return normalizedMonthly * 12;
  }

  if (normalizedAnnual > 0) {
    return normalizedAnnual;
  }

  return defaultValue;
};

export const calculateMonthlyPaymentFromMonthlyRate = (
  principal: number,
  monthlyRatePercent: number,
  termMonths: number
): number => {
  if (termMonths <= 0 || principal <= 0) {
    return 0;
  }

  const r = (monthlyRatePercent || 0) / 100;
  if (r === 0) {
    return roundCurrency(principal / termMonths);
  }

  const numerator = r * Math.pow(1 + r, termMonths);
  const denominator = Math.pow(1 + r, termMonths) - 1;
  return roundCurrency(principal * (numerator / denominator));
};

export type AmortizationRow = {
  month: number;
  startingBalance: number;
  interest: number;
  payment: number;
  principalPayment: number;
  endingBalance: number;
  dueDate?: string;
};

/**
 * Generate an amortization schedule using the monthly-rate PMT formula.
 * - monthlyRatePercent is a percentage (e.g. 3.5 for 3.5% / month)
 * - payment amount is computed with calculateMonthlyPaymentFromMonthlyRate
 * - last payment is adjusted so remaining balance becomes exactly zero (avoid rounding leftovers)
 */
export const generateAmortizationSchedule = (
  principal: number,
  monthlyRatePercent: number,
  termMonths: number,
  startDate?: string | Date
): AmortizationRow[] => {
  if (termMonths <= 0 || principal <= 0) return [];

  const payment = calculateMonthlyPaymentFromMonthlyRate(principal, monthlyRatePercent, termMonths);
  let balance = roundCurrency(principal);
  const r = (monthlyRatePercent || 0) / 100;
  const rows: AmortizationRow[] = [];

  const baseDate = startDate ? new Date(startDate) : undefined;

  for (let i = 1; i <= termMonths; i++) {
    const interest = roundCurrency(balance * r);
    const isLast = i === termMonths;
    let principalPayment: number;
    let totalPayment: number;

    if (isLast) {
      principalPayment = roundCurrency(balance);
      totalPayment = roundCurrency(principalPayment + interest);
    } else {
      principalPayment = roundCurrency(payment - interest);
      // ensure we never overpay principal due to rounding
      if (principalPayment > balance) principalPayment = roundCurrency(balance);
      totalPayment = payment;
    }

    const endingBalance = roundCurrency(Math.max(0, balance - principalPayment));

    const row: AmortizationRow = {
      month: i,
      startingBalance: roundCurrency(balance),
      interest,
      payment: totalPayment,
      principalPayment,
      endingBalance
    };

    if (baseDate) {
      const d = new Date(baseDate.getTime());
      d.setMonth(d.getMonth() + i);
      row.dueDate = d.toISOString();
    }

    rows.push(row);
    balance = endingBalance;
  }

  return rows;
};