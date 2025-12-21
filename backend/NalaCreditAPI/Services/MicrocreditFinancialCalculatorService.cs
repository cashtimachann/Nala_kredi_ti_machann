namespace NalaCreditAPI.Services
{
    public interface IMicrocreditFinancialCalculatorService
    {
        decimal CalculateMonthlyPayment(decimal principalAmount, decimal monthlyInterestRate, int durationMonths);
        decimal CalculateTotalInterest(decimal principalAmount, decimal monthlyInterestRate, int durationMonths);
        decimal CalculateRemainingBalance(decimal principalAmount, decimal monthlyInterestRate, int durationMonths, int paymentsMade);
        List<PaymentScheduleItem> GeneratePaymentSchedule(decimal principalAmount, decimal annualInterestRate, int durationMonths, DateTime startDate);
        PaymentAllocation CalculatePaymentAllocation(decimal paymentAmount, decimal outstandingPrincipal, decimal outstandingInterest, decimal outstandingPenalties);
        decimal CalculatePenalty(decimal overdueAmount, decimal penaltyRate, int daysOverdue);
        decimal CalculateEarlyPaymentSavings(decimal remainingPrincipal, decimal monthlyInterestRate, int remainingMonths);
        LoanAmortizationSummary CalculateAmortization(decimal principalAmount, decimal annualInterestRate, int durationMonths);
    }

    public class MicrocreditFinancialCalculatorService : IMicrocreditFinancialCalculatorService
    {
        public decimal CalculateMonthlyPayment(decimal principalAmount, decimal monthlyInterestRate, int durationMonths)
        {
            if (monthlyInterestRate == 0)
                return principalAmount / durationMonths;

            var rate = (double)monthlyInterestRate;
            var months = durationMonths;
            var principal = (double)principalAmount;

            var payment = principal * (rate * Math.Pow(1 + rate, months)) / (Math.Pow(1 + rate, months) - 1);
            
            return (decimal)Math.Round(payment, 2);
        }

        public decimal CalculateTotalInterest(decimal principalAmount, decimal monthlyInterestRate, int durationMonths)
        {
            var monthlyPayment = CalculateMonthlyPayment(principalAmount, monthlyInterestRate, durationMonths);
            var totalPayments = monthlyPayment * durationMonths;
            return totalPayments - principalAmount;
        }

        public decimal CalculateRemainingBalance(decimal principalAmount, decimal monthlyInterestRate, int durationMonths, int paymentsMade)
        {
            if (paymentsMade >= durationMonths)
                return 0;

            if (monthlyInterestRate == 0)
                return principalAmount - (principalAmount / durationMonths * paymentsMade);

            var rate = (double)monthlyInterestRate;
            var n = durationMonths;
            var p = paymentsMade;
            var principal = (double)principalAmount;

            var remainingBalance = principal * (Math.Pow(1 + rate, n) - Math.Pow(1 + rate, p)) / (Math.Pow(1 + rate, n) - 1);
            
            return (decimal)Math.Max(0, Math.Round(remainingBalance, 2));
        }

        public List<PaymentScheduleItem> GeneratePaymentSchedule(decimal principalAmount, decimal annualInterestRate, int durationMonths, DateTime startDate)
        {
            var schedule = new List<PaymentScheduleItem>();
            var monthlyInterestRate = annualInterestRate / 12;
            var monthlyPayment = CalculateMonthlyPayment(principalAmount, monthlyInterestRate, durationMonths);
            
            var remainingBalance = principalAmount;

            for (int i = 1; i <= durationMonths; i++)
            {
                var interestPayment = remainingBalance * monthlyInterestRate;
                var principalPayment = monthlyPayment - interestPayment;

                // Ajuster le dernier paiement pour éviter les arrondis
                if (i == durationMonths)
                {
                    principalPayment = remainingBalance;
                    monthlyPayment = principalPayment + interestPayment;
                }

                remainingBalance -= principalPayment;

                // Calculer la date d'échéance: startDate + (i-1) mois pour avoir la première échéance à startDate
                var dueDate = DateOnly.FromDateTime(startDate.AddMonths(i - 1));

                schedule.Add(new PaymentScheduleItem
                {
                    InstallmentNumber = i,
                    DueDate = dueDate,
                    PrincipalAmount = Math.Round(principalPayment, 2),
                    InterestAmount = Math.Round(interestPayment, 2),
                    TotalAmount = Math.Round(monthlyPayment, 2),
                    RemainingBalance = Math.Round(Math.Max(0, remainingBalance), 2)
                });
            }

            return schedule;
        }

        public PaymentAllocation CalculatePaymentAllocation(decimal paymentAmount, decimal outstandingPrincipal, decimal outstandingInterest, decimal outstandingPenalties)
        {
            var allocation = new PaymentAllocation();
            var remainingPayment = paymentAmount;

            // Priorité 1: Pénalités
            allocation.PenaltyAmount = Math.Min(remainingPayment, outstandingPenalties);
            remainingPayment -= allocation.PenaltyAmount;

            // Priorité 2: Intérêts
            if (remainingPayment > 0)
            {
                allocation.InterestAmount = Math.Min(remainingPayment, outstandingInterest);
                remainingPayment -= allocation.InterestAmount;
            }

            // Priorité 3: Principal
            if (remainingPayment > 0)
            {
                allocation.PrincipalAmount = Math.Min(remainingPayment, outstandingPrincipal);
                remainingPayment -= allocation.PrincipalAmount;
            }

            // Surplus (remboursement anticipé)
            allocation.ExcessAmount = remainingPayment;

            return allocation;
        }

        public decimal CalculatePenalty(decimal overdueAmount, decimal penaltyRate, int daysOverdue)
        {
            // Calculer les pénalités basées sur le montant en retard et le nombre de jours
            var monthsOverdue = Math.Ceiling((decimal)daysOverdue / 30);
            return overdueAmount * penaltyRate * monthsOverdue;
        }

        public decimal CalculateEarlyPaymentSavings(decimal remainingPrincipal, decimal monthlyInterestRate, int remainingMonths)
        {
            if (remainingMonths <= 0 || monthlyInterestRate == 0)
                return 0;

            var futureInterest = CalculateTotalInterest(remainingPrincipal, monthlyInterestRate, remainingMonths);
            return futureInterest * 0.8m; // 80% des intérêts futurs économisés
        }

        public LoanAmortizationSummary CalculateAmortization(decimal principalAmount, decimal annualInterestRate, int durationMonths)
        {
            var monthlyInterestRate = annualInterestRate / 12;
            var monthlyPayment = CalculateMonthlyPayment(principalAmount, monthlyInterestRate, durationMonths);
            var totalInterest = CalculateTotalInterest(principalAmount, monthlyInterestRate, durationMonths);

            return new LoanAmortizationSummary
            {
                PrincipalAmount = principalAmount,
                MonthlyPayment = monthlyPayment,
                TotalInterest = totalInterest,
                TotalAmount = principalAmount + totalInterest,
                AnnualInterestRate = annualInterestRate,
                DurationMonths = durationMonths,
                EffectiveInterestRate = (totalInterest / principalAmount) / (durationMonths / 12.0m)
            };
        }
    }

    // Classes utilitaires pour les calculs
    public class PaymentScheduleItem
    {
        public int InstallmentNumber { get; set; }
        public DateOnly DueDate { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal RemainingBalance { get; set; }
    }

    public class PaymentAllocation
    {
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public decimal ExcessAmount { get; set; }

        public decimal TotalAllocated => PrincipalAmount + InterestAmount + PenaltyAmount;
    }

    public class LoanAmortizationSummary
    {
        public decimal PrincipalAmount { get; set; }
        public decimal MonthlyPayment { get; set; }
        public decimal TotalInterest { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AnnualInterestRate { get; set; }
        public int DurationMonths { get; set; }
        public decimal EffectiveInterestRate { get; set; }
    }
}