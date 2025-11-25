using NalaCreditAPI.Models;

namespace NalaCreditAPI.Helpers
{
    public static class GuaranteePolicy
    {
        /// <summary>
        /// Returns the guarantee (blocked savings) percentage required for a given loan type.
        /// </summary>
        public static decimal GetGuaranteePercentage(MicrocreditLoanType loanType)
        {
            return loanType == MicrocreditLoanType.CreditAuto || loanType == MicrocreditLoanType.CreditMoto
                ? 0.30m
                : 0.15m;
        }
    }
}