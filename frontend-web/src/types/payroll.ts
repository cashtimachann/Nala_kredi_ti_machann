// Payroll System Types

// Enums
export enum EmployeeStatus {
  Active = 0,
  Inactive = 1,
  Suspended = 2,
  Terminated = 3
}

export enum EmployeeFunction {
  Cashier = 0,
  CreditAgent = 1,
  BranchSupervisor = 2,
  RegionalManager = 3,
  SystemAdmin = 4,
  Accounting = 5,
  Management = 6,
  SuperAdmin = 7,
  Security = 8,
  Maintenance = 9,
  CustomerService = 10
}

export enum PaymentMode {
  Cash = 0,
  BankTransfer = 1,
  Check = 2,
  MobilePayment = 3
}

export enum PayrollStatus {
  Draft = 0,
  Approved = 1,
  Paid = 2,
  Cancelled = 3
}

export enum SalaryAdvanceStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Paid = 3,
  Repaid = 4,
  PartiallyRepaid = 5,
  Cancelled = 6
}

export enum DeductionType {
  Tax = 0,
  SocialSecurity = 1,
  HealthInsurance = 2,
  RetirementFund = 3,
  UnionFees = 4,
  LoanRepayment = 5,
  SalaryAdvanceRepayment = 6,
  Other = 7
}

// Base Interfaces
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  dateOfBirth: string;
  hireDate: string;
  terminationDate?: string;
  function: EmployeeFunction;
  functionName: string;
  status: EmployeeStatus;
  statusName: string;
  branchId: string;
  branchName: string;
  baseSalary: number;
  currency: 'HTG' | 'USD';
  bankAccountNumber?: string;
  bankName?: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PayrollPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  payDate: string;
  branchId: string;
  branchName: string;
  status: PayrollStatus;
  statusName: string;
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  currency: 'HTG' | 'USD';
  notes?: string;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Payslip {
  id: string;
  payrollPeriodId: string;
  payrollPeriodName: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  baseSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimeAmount: number;
  bonusAmount: number;
  allowancesAmount: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  currency: 'HTG' | 'USD';
  paymentMode: PaymentMode;
  paymentModeName: string;
  paymentDate?: string;
  paymentReference?: string;
  status: PayrollStatus;
  statusName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  deductions: PayrollDeduction[];
}

export interface PayrollDeduction {
  id: string;
  payslipId: string;
  deductionType: DeductionType;
  deductionTypeName: string;
  description: string;
  amount: number;
  isPercentage: boolean;
  percentage?: number;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  requestDate: string;
  approvalDate?: string;
  paymentDate?: string;
  requestedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  repaidAmount: number;
  balanceAmount: number;
  currency: 'HTG' | 'USD';
  reason: string;
  status: SalaryAdvanceStatus;
  statusName: string;
  paymentMode: PaymentMode;
  paymentModeName: string;
  paymentReference?: string;
  repaymentStartDate?: string;
  repaymentMonths: number;
  monthlyRepaymentAmount: number;
  notes?: string;
  requestedBy: string;
  approvedBy?: string;
  paidBy?: string;
  createdAt: string;
  updatedAt: string;
}

// DTOs for forms and API calls
export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  dateOfBirth: string;
  hireDate: string;
  function: EmployeeFunction;
  branchId: string;
  baseSalary: number;
  currency: 'HTG' | 'USD';
  bankAccountNumber?: string;
  bankName?: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  id: string;
  status?: EmployeeStatus;
  terminationDate?: string;
}

export interface CreatePayrollPeriodDto {
  periodName: string;
  startDate: string;
  endDate: string;
  payDate: string;
  branchId: string;
  currency: 'HTG' | 'USD';
  notes?: string;
}

export interface PayrollCalculationDto {
  employeeId: string;
  baseSalary: number;
  overtimeHours?: number;
  overtimeRate?: number;
  bonusAmount?: number;
  allowancesAmount?: number;
  deductions: {
    deductionType: DeductionType;
    amount?: number;
    percentage?: number;
    description: string;
  }[];
}

export interface ProcessPayrollDto {
  payrollPeriodId: string;
  employees: PayrollCalculationDto[];
}

export interface CreateSalaryAdvanceDto {
  employeeId: string;
  requestedAmount: number;
  currency: 'HTG' | 'USD';
  reason: string;
  repaymentMonths: number;
}

export interface ApproveSalaryAdvanceDto {
  id: string;
  approvedAmount: number;
  repaymentStartDate: string;
  repaymentMonths: number;
  notes?: string;
}

export interface PaySalaryAdvanceDto {
  id: string;
  paymentMode: PaymentMode;
  paymentReference?: string;
  paymentDate: string;
}

// Search and Filter DTOs
export interface EmployeeSearchDto {
  branchId?: string;
  function?: EmployeeFunction;
  status?: EmployeeStatus;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export interface PayrollSearchDto {
  branchId?: string;
  status?: PayrollStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface SalaryAdvanceSearchDto {
  branchId?: string;
  employeeId?: string;
  status?: SalaryAdvanceStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// Statistics and Reports
export interface PayrollStatistics {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  averageSalary: number;
  totalOvertime: number;
  totalBonuses: number;
  totalDeductions: number;
  payrollByBranch: {
    branchId: string;
    branchName: string;
    employeeCount: number;
    totalPayroll: number;
  }[];
  payrollByFunction: {
    function: EmployeeFunction;
    functionName: string;
    employeeCount: number;
    totalPayroll: number;
    averageSalary: number;
  }[];
}

export interface SalaryAdvanceStatistics {
  totalRequests: number;
  approvedRequests: number;
  totalAmount: number;
  outstandingAmount: number;
  averageAdvanceAmount: number;
  advancesByStatus: {
    status: SalaryAdvanceStatus;
    statusName: string;
    count: number;
    totalAmount: number;
  }[];
}

// Helper functions for formatting
export const formatEmployeeFunction = (func: EmployeeFunction): string => {
  const functions = {
    [EmployeeFunction.Cashier]: 'Caissier',
    [EmployeeFunction.CreditAgent]: 'Agent de Crédit',
    [EmployeeFunction.BranchSupervisor]: 'Superviseur de Succursale',
    [EmployeeFunction.RegionalManager]: 'Gestionnaire Régional',
    [EmployeeFunction.SystemAdmin]: 'Administrateur Système',
    [EmployeeFunction.Accounting]: 'Comptabilité',
    [EmployeeFunction.Management]: 'Direction',
    [EmployeeFunction.SuperAdmin]: 'Super Administrateur',
    [EmployeeFunction.Security]: 'Sécurité',
    [EmployeeFunction.Maintenance]: 'Maintenance',
    [EmployeeFunction.CustomerService]: 'Service Client'
  };
  return functions[func] || 'Inconnu';
};

export const formatEmployeeStatus = (status: EmployeeStatus): string => {
  const statuses = {
    [EmployeeStatus.Active]: 'Actif',
    [EmployeeStatus.Inactive]: 'Inactif',
    [EmployeeStatus.Suspended]: 'Suspendu',
    [EmployeeStatus.Terminated]: 'Licencié'
  };
  return statuses[status] || 'Inconnu';
};

export const formatPaymentMode = (mode: PaymentMode): string => {
  const modes = {
    [PaymentMode.Cash]: 'Espèces',
    [PaymentMode.BankTransfer]: 'Virement Bancaire',
    [PaymentMode.Check]: 'Chèque',
    [PaymentMode.MobilePayment]: 'Paiement Mobile'
  };
  return modes[mode] || 'Inconnu';
};

export const formatDeductionType = (type: DeductionType): string => {
  const types = {
    [DeductionType.Tax]: 'Impôt',
    [DeductionType.SocialSecurity]: 'Sécurité Sociale',
    [DeductionType.HealthInsurance]: 'Assurance Santé',
    [DeductionType.RetirementFund]: 'Fonds de Retraite',
    [DeductionType.UnionFees]: 'Cotisations Syndicales',
    [DeductionType.LoanRepayment]: 'Remboursement de Prêt',
    [DeductionType.SalaryAdvanceRepayment]: 'Remboursement d\'Avance',
    [DeductionType.Other]: 'Autre'
  };
  return types[type] || 'Inconnu';
};