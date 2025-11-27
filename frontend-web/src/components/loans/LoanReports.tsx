import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  Percent,
  BarChart3,
  PieChart,
  FileText,
  Filter,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Target,
  RefreshCw,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import microcreditLoanApplicationService from '../../services/microcreditLoanApplicationService';
import microcreditPaymentService from '../../services/microcreditPaymentService';
import apiService from '../../services/apiService';

const EXCHANGE_RATE = 130; // Taux de change HTG/USD pour les calculs approximatifs

interface LoanReportsProps {
  onClose?: () => void;
}

interface PortfolioMetrics {
  totalLoans: number;
  totalDisbursed: { HTG: number; USD: number };
  totalOutstanding: { HTG: number; USD: number };
  totalCollected: { HTG: number; USD: number };
  averageInterestRate: number;
  averageLoanSize: { HTG: number; USD: number };
  portfolioAtRisk: number;
  par30: number;
  par60: number;
  par90: number;
  repaymentRate: number;
  defaultRate: number;
}

interface LoanTypePerformance {
  type: string;
  count: number;
  totalAmount: { HTG: number; USD: number };
  outstanding: { HTG: number; USD: number };
  repaymentRate: number;
  defaultRate: number;
  averageInterestRate: number;
}

interface BranchPerformance {
  branch: string;
  totalLoans: number;
  disbursed: { HTG: number; USD: number };
  outstanding: { HTG: number; USD: number };
  repaymentRate: number;
  par30: number;
}

interface LoanOfficerPerformance {
  officer: string;
  totalLoans: number;
  activeLoans: number;
  disbursed: { HTG: number; USD: number };
  collected: { HTG: number; USD: number };
  repaymentRate: number;
  overdueLoans: number;
}

interface OverdueDetail {
  loanNumber: string;
  customerName: string;
  amount: number;
  currency: 'HTG' | 'USD';
  daysOverdue: number;
  dueAmount: number;
  phone: string;
  officer: string;
  branch: string;
}

const LoanReports: React.FC<LoanReportsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'performance' | 'overdue' | 'collection'>('portfolio');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [currency, setCurrency] = useState<'ALL' | 'HTG' | 'USD'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for real data
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics>({
    totalLoans: 0,
    totalDisbursed: { HTG: 0, USD: 0 },
    totalOutstanding: { HTG: 0, USD: 0 },
    totalCollected: { HTG: 0, USD: 0 },
    averageInterestRate: 0,
    averageLoanSize: { HTG: 0, USD: 0 },
    portfolioAtRisk: 0,
    par30: 0,
    par60: 0,
    par90: 0,
    repaymentRate: 0,
    defaultRate: 0
  });
  
  const [loanTypePerformance, setLoanTypePerformance] = useState<LoanTypePerformance[]>([]);
  const [branchPerformance, setBranchPerformance] = useState<BranchPerformance[]>([]);
  const [loanOfficerPerformance, setLoanOfficerPerformance] = useState<LoanOfficerPerformance[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<OverdueDetail[]>([]);

  // Load data from API
  useEffect(() => {
    loadBranches();
    loadReportsData();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    if (!loading) {
      loadReportsData();
    }
  }, [selectedBranch, dateRange, startDate, endDate, currency]);

  const loadBranches = async () => {
    try {
      const branchesData = await apiService.getAllBranches();
      const formattedBranches = [
        { id: 'ALL', name: 'Toutes les succursales' },
        ...branchesData.map(b => ({
          id: b.id.toString(),
          name: b.name
        }))
      ];
      setBranches(formattedBranches);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Erreur lors du chargement des succursales');
      // Fallback to default branches
      setBranches([
        { id: 'ALL', name: 'Toutes les succursales' }
      ]);
    }
  };

  const loadReportsData = async () => {
    try {
      setLoading(true);

      // Build filters object
      const filters: any = {};
      const branchId = selectedBranch && selectedBranch !== 'ALL' ? parseInt(selectedBranch) : undefined;
      if (branchId) filters.branchId = branchId;
      
      // Add date range filter
      if (dateRange === 'custom' && startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      } else {
        filters.dateRange = dateRange;
      }
      
      // Add currency filter
      if (currency !== 'ALL') {
        filters.currency = currency;
      }

      // Determine fromDate/toDate (YYYY-MM-DD) based on dateRange for payment stats
      const toDate = new Date();
      let fromDate = new Date();
      switch (dateRange) {
        case 'today':
          fromDate = new Date();
          break;
        case 'week':
          fromDate.setDate(toDate.getDate() - 7);
          break;
        case 'month':
          fromDate.setMonth(toDate.getMonth() - 1);
          break;
        case 'quarter':
          fromDate.setMonth(toDate.getMonth() - 3);
          break;
        case 'year':
          fromDate.setFullYear(toDate.getFullYear() - 1);
          break;
        case 'custom':
          if (startDate && endDate) {
            fromDate = new Date(startDate);
            // toDate = new Date(endDate);
          } else {
            fromDate.setMonth(toDate.getMonth() - 1);
          }
          break;
        default:
          fromDate.setMonth(toDate.getMonth() - 1);
      }

      const fromDateString = fromDate.toISOString().split('T')[0];
      const toDateString = new Date().toISOString().split('T')[0];

      // Load all data in parallel
      const [stats, loansByType, agentPerformance, overdue, collectedStats] = await Promise.all([
        microcreditLoanApplicationService.getDashboardStats(filters),
        microcreditLoanApplicationService.getLoansByType(branchId, 'Active'),
        microcreditLoanApplicationService.getAgentPerformance(branchId),
        microcreditLoanApplicationService.getOverdueLoans(undefined, branchId),
        microcreditPaymentService.getPaymentStatistics(fromDateString, toDateString, branchId).catch(err => {
          console.warn('Unable to load payment statistics:', err);
          return null;
        })
      ]);
      
      // Calculate portfolio metrics from stats
      const totalDisbursed = {
        HTG: (stats.totalDisbursed?.HTG || stats.totalDisbursed?.htg || 0),
        USD: (stats.totalDisbursed?.USD || stats.totalDisbursed?.usd || 0)
      };
      
      const totalOutstanding = {
        HTG: (stats.totalOutstanding?.HTG || stats.totalOutstanding?.htg || 0),
        USD: (stats.totalOutstanding?.USD || stats.totalOutstanding?.usd || 0)
      };
      
      const interestCollected = {
        HTG: (stats.interestRevenue?.HTG || stats.interestRevenue?.htg || 0),
        USD: (stats.interestRevenue?.USD || stats.interestRevenue?.usd || 0)
      };
      
      const overdueAmount = {
        HTG: (stats.overdueLoans?.amount?.HTG || stats.overdueLoans?.amount?.htg || 0),
        USD: (stats.overdueLoans?.amount?.USD || stats.overdueLoans?.amount?.usd || 0)
      };
      
      // Calculate PAR (Portfolio at Risk)
      const totalOutstandingSum = totalOutstanding.HTG + (totalOutstanding.USD * EXCHANGE_RATE);
      const overdueSum = overdueAmount.HTG + (overdueAmount.USD * EXCHANGE_RATE);
      const portfolioAtRisk = totalOutstandingSum > 0 ? (overdueSum / totalOutstandingSum) * 100 : 0;
      
      setPortfolioMetrics({
        totalLoans: stats.activeLoans || 0,
        totalDisbursed: totalDisbursed,
        totalOutstanding: totalOutstanding,
        totalCollected: collectedStats ? {
          HTG: (collectedStats.totalPrincipalCollected || 0) + (collectedStats.totalInterestCollected || 0) + (collectedStats.totalPenaltiesCollected || 0),
          USD: 0 // For now we only support HTG aggregation; collection by USD can be added later
        } : interestCollected,
        averageInterestRate: 0, // Would need to calculate from individual loans
        averageLoanSize: {
          HTG: stats.activeLoans > 0 ? totalOutstanding.HTG / stats.activeLoans : 0,
          USD: stats.activeLoans > 0 ? totalOutstanding.USD / stats.activeLoans : 0
        },
        portfolioAtRisk: portfolioAtRisk,
        par30: stats.par30 || 0,
        par60: stats.par60 || 0,
        par90: stats.par90 || 0,
        repaymentRate: stats.repaymentRate || 0,
        defaultRate: stats.defaultRate || 0
      });

      // Process loans by type
      const typePerformance: LoanTypePerformance[] = Object.entries(loansByType).map(([type, loans]: [string, any]) => {
        const totalHTG = loans.filter((l: any) => l.currency === 'HTG').reduce((sum: number, l: any) => sum + (l.principalAmount || 0), 0);
        const totalUSD = loans.filter((l: any) => l.currency === 'USD').reduce((sum: number, l: any) => sum + (l.principalAmount || 0), 0);
        const outstandingHTG = loans.filter((l: any) => l.currency === 'HTG').reduce((sum: number, l: any) => sum + (l.outstandingBalance || 0), 0);
        const outstandingUSD = loans.filter((l: any) => l.currency === 'USD').reduce((sum: number, l: any) => sum + (l.outstandingBalance || 0), 0);
        
        return {
          type,
          count: loans.length,
          totalAmount: { HTG: totalHTG, USD: totalUSD },
          outstanding: { HTG: outstandingHTG, USD: outstandingUSD },
          repaymentRate: 0, // Would need payment data to calculate
          defaultRate: 0, // Would need payment data to calculate
          averageInterestRate: loans.length > 0 ? loans.reduce((sum: number, l: any) => sum + (l.interestRate || 0), 0) / loans.length : 0
        };
      });
  // Update frontend portfolio totalLoans to match the number of loans used to compute distributions
  const totalLoansFromTypes = typePerformance.reduce((acc, t) => acc + (t.count || 0), 0);
  setPortfolioMetrics(prev => ({ ...prev, totalLoans: totalLoansFromTypes || prev.totalLoans }));
  // Sort types by descending count for better UX
  typePerformance.sort((a, b) => (b.count || 0) - (a.count || 0));
  setLoanTypePerformance(typePerformance);

      // Process agent performance
      const officerPerformance: LoanOfficerPerformance[] = agentPerformance.map((agent: any) => {
        const totalLoansVal = agent.totalLoans || agent.totalLoansManaged || agent.totalLoansManaged || 0;
        const activeLoansVal = agent.activeLoans || 0;

        // Disbursed may come as an object { HTG, USD } or a number (sum) depending on backend version
        const disbursedHTG = (agent.totalDisbursed && typeof agent.totalDisbursed === 'object')
          ? (agent.totalDisbursed.HTG || agent.totalDisbursed.htg || 0)
          : (agent.totalDisbursedHTG || agent.totalDisbursed || 0);
        const disbursedUSD = (agent.totalDisbursed && typeof agent.totalDisbursed === 'object')
          ? (agent.totalDisbursed.USD || agent.totalDisbursed.usd || 0)
          : (agent.totalDisbursedUSD || 0);

        // Collected may also be an object or a number
        const collectedHTG = (agent.totalCollected && typeof agent.totalCollected === 'object')
          ? (agent.totalCollected.HTG || agent.totalCollected.htg || 0)
          : (agent.totalCollectedHTG || agent.totalCollected || 0);
        const collectedUSD = (agent.totalCollected && typeof agent.totalCollected === 'object')
          ? (agent.totalCollected.USD || agent.totalCollected.usd || 0)
          : (agent.totalCollectedUSD || 0);

        const repaymentRateVal = agent.repaymentRate || agent.collectionRate || 0;

        return {
          officer: agent.agentName || agent.name || 'N/A',
          totalLoans: totalLoansVal,
          activeLoans: activeLoansVal,
          disbursed: { HTG: disbursedHTG, USD: disbursedUSD },
          collected: { HTG: collectedHTG, USD: collectedUSD },
          repaymentRate: repaymentRateVal,
          overdueLoans: agent.overdueLoans || 0
        };
      });
      setLoanOfficerPerformance(officerPerformance);

      // Process branch performance (backend sometimes returns PascalCase properties)
      const branchPerf: BranchPerformance[] = [];
      const branchStatsSource = stats.branchPerformance || stats.BranchPerformance || stats.BranchPerformanceSummary || stats.branchPerformanceSummary;
      if (branchStatsSource && Array.isArray(branchStatsSource)) {
        branchStatsSource.forEach((branch: any) => {
          // Accept both camelCase and PascalCase keys, or aggregated fields
          const disbursed = branch.totalDisbursed || branch.TotalDisbursed || branch.totalDisbursedAmount || branch.TotalDisbursedAmount;
          const outstanding = branch.totalOutstanding || branch.TotalOutstanding || branch.totalOutstandingAmount || branch.TotalOutstandingAmount;
          const repaymentRate = typeof branch.repaymentRate === 'number'
            ? branch.repaymentRate
            : parseFloat(branch.repaymentRate || branch.RepaymentRate || '0') || 0;
          const par30 = typeof branch.par30 === 'number'
            ? branch.par30
            : parseFloat(branch.par30 || branch.Par30 || '0') || 0;

          branchPerf.push({
            branch: branch.branchName || branch.BranchName || branch.name || branch.name || 'N/A',
            totalLoans: branch.totalLoans || branch.TotalLoans || 0,
            disbursed: {
              HTG: disbursed?.HTG || disbursed?.htg || branch.totalDisbursedHTG || branch.TotalDisbursedHTG || 0,
              USD: disbursed?.USD || disbursed?.usd || branch.totalDisbursedUSD || branch.TotalDisbursedUSD || 0
            },
            outstanding: {
              HTG: outstanding?.HTG || outstanding?.htg || branch.totalOutstandingHTG || branch.TotalOutstandingHTG || 0,
              USD: outstanding?.USD || outstanding?.usd || branch.totalOutstandingUSD || branch.TotalOutstandingUSD || 0
            },
            repaymentRate,
            par30
          });
        });
      }
      setBranchPerformance(branchPerf);

      // Process overdue loans
      const overdueDetails: OverdueDetail[] = overdue.map((loan: any) => ({
        loanNumber: loan.loanNumber || loan.id || 'N/A',
        customerName: loan.borrower?.firstName && loan.borrower?.lastName 
          ? `${loan.borrower.firstName} ${loan.borrower.lastName}`
          : loan.customerName || 'N/A',
        amount: loan.principalAmount || 0,
        currency: loan.currency || 'HTG',
        daysOverdue: loan.daysOverdue || 0,
        dueAmount: loan.outstandingBalance || loan.overdueAmount || 0,
        phone: loan.borrower?.contact?.phone || loan.phoneNumber || 'N/A',
        officer: loan.loanOfficerName || loan.loanOfficer || 'N/A',
        branch: loan.branchName || loan.branch || 'N/A'
      }));
      setOverdueLoans(overdueDetails);

    } catch (error: any) {
      console.error('Error loading reports data:', error);
      toast.error('Erreur lors du chargement des données de rapport. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, curr: string) => {
    if (curr === 'HTG') {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount) + ' HTG';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getLoanTypeLabel = (type: string) => {
    const normalize = (s: string) => (s || '').replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
    const key = normalize(type);
    const labels: Record<string, { label: string; emoji: string; color: string }> = {
      COMMERCIAL: { label: 'Commercial', emoji: '🏪', color: 'blue' },
      AGRICULTURAL: { label: 'Agricole', emoji: '🌾', color: 'green' },
      PERSONAL: { label: 'Personnel', emoji: '👤', color: 'purple' },
      EMERGENCY: { label: 'Urgence', emoji: '🚨', color: 'red' },
      CREDIT_LOYER: { label: 'Loyer', emoji: '🏠', color: 'cyan' },
      CREDIT_AUTO: { label: 'Auto', emoji: '🚗', color: 'orange' },
      CREDIT_MOTO: { label: 'Moto', emoji: '🏍', color: 'teal' },
      CREDIT_PERSONNEL: { label: 'Personnel (Spéc.)', emoji: '👥', color: 'purple' },
      CREDIT_SCOLAIRE: { label: 'Scolaire', emoji: '🎒', color: 'yellow' },
      CREDIT_AGRICOLE: { label: 'Agricole (Spéc.)', emoji: '🌾', color: 'green' },
      CREDIT_PROFESSIONNEL: { label: 'Professionnel', emoji: '💼', color: 'indigo' },
      CREDIT_APPUI: { label: 'Appui', emoji: '🤝', color: 'lime' },
      CREDIT_HYPOTHECAIRE: { label: 'Hypothécaire', emoji: '🏦', color: 'gray' }
    };
    return labels[key] || { label: type || 'Autre', emoji: '📦', color: 'gray' };
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-blue-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPARColor = (par: number) => {
    if (par < 5) return 'text-green-600';
    if (par < 10) return 'text-yellow-600';
    if (par < 15) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (type: string) => {
    const normalize = (s: string) => (s || '').replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
    const key = normalize(type);
    const colors: Record<string, string> = {
      COMMERCIAL: 'bg-blue-500',
      AGRICULTURAL: 'bg-green-500',
      PERSONAL: 'bg-purple-500',
      EMERGENCY: 'bg-red-500',
      CREDIT_LOYER: 'bg-cyan-500',
      CREDIT_AUTO: 'bg-orange-500',
      CREDIT_MOTO: 'bg-teal-500',
      CREDIT_PERSONNEL: 'bg-purple-400',
      CREDIT_SCOLAIRE: 'bg-yellow-400',
      CREDIT_AGRICOLE: 'bg-green-600',
      CREDIT_PROFESSIONNEL: 'bg-indigo-500',
      CREDIT_APPUI: 'bg-lime-500',
      CREDIT_HYPOTHECAIRE: 'bg-gray-500'
    };
    return colors[key] || 'bg-gray-500';
  };

  const handleExport = (format: 'PDF' | 'EXCEL') => {
    if (format === 'EXCEL') {
      handleExportCSV(activeTab);
      return;
    }

    try {
      toast.loading('Génération du PDF en cours...');
      const doc = new jsPDF();
      const today = new Date().toLocaleDateString('fr-FR');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Rapport de Microcrédits', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le: ${today}`, 14, 30);
      doc.text(`Succursale: ${branches.find(b => b.id === selectedBranch)?.name || 'Toutes'}`, 14, 35);

      if (activeTab === 'portfolio') {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Vue d\'ensemble du Portefeuille', 14, 45);
        
        // Metrics Table
        const metricsData = [
          ['Total Prêts', portfolioMetrics.totalLoans.toString()],
          ['Capital Décaissé (HTG)', formatCurrency(portfolioMetrics.totalDisbursed.HTG, 'HTG')],
          ['Capital Restant (HTG)', formatCurrency(portfolioMetrics.totalOutstanding.HTG, 'HTG')],
          ['Taux de Remboursement', `${portfolioMetrics.repaymentRate}%`],
          ['Portefeuille à Risque (PAR)', `${portfolioMetrics.portfolioAtRisk.toFixed(2)}%`],
          ['PAR 30 jours', `${portfolioMetrics.par30}%`],
        ];

        (doc as any).autoTable({
          startY: 50,
          head: [['Métrique', 'Valeur']],
          body: metricsData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] }
        });

        // Loan Types Table
        const typeData = loanTypePerformance.map(t => [
          t.type,
          t.count,
          formatCurrency(t.totalAmount.HTG, 'HTG'),
          formatCurrency(t.outstanding.HTG, 'HTG'),
          `${t.averageInterestRate}%`
        ]);

        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable.finalY + 15,
          head: [['Type de Prêt', 'Nombre', 'Total Décaissé', 'Encours', 'Taux Intérêt']],
          body: typeData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }
        });

      } else if (activeTab === 'performance') {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Performance par Succursale', 14, 45);

        const branchData = branchPerformance.map(b => [
          b.branch,
          b.totalLoans,
          formatCurrency(b.disbursed.HTG, 'HTG'),
          formatCurrency(b.disbursed.USD, 'USD'),
          formatCurrency(b.outstanding.HTG, 'HTG'),
          formatCurrency(b.outstanding.USD, 'USD'),
          `${b.repaymentRate.toFixed(2)}%`,
          `${b.par30.toFixed(2)}%`
        ]);

        (doc as any).autoTable({
          startY: 50,
          head: [['Succursale', 'Prêts', 'Décaissé HTG', 'Décaissé USD', 'Encours HTG', 'Encours USD', 'Remboursement', 'PAR 30']],
          body: branchData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }
        });

        doc.text('Performance des Agents', 14, (doc as any).lastAutoTable.finalY + 15);

        const officerData = loanOfficerPerformance.map(o => [
          o.officer,
          o.totalLoans,
          o.activeLoans,
          formatCurrency(o.disbursed.HTG, 'HTG'),
          formatCurrency(o.collected.HTG, 'HTG'),
          `${o.repaymentRate}%`
        ]);

        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Agent', 'Total', 'Actifs', 'Décaissé', 'Collecté', 'Remboursement']],
          body: officerData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }
        });

      } else if (activeTab === 'overdue') {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Prêts en Retard', 14, 45);

        const overdueData = overdueLoans.map(l => [
          l.loanNumber,
          l.customerName,
          formatCurrency(l.dueAmount, l.currency),
          l.daysOverdue,
          l.phone,
          l.officer
        ]);

        (doc as any).autoTable({
          startY: 50,
          head: [['Numéro', 'Client', 'Montant Dû', 'Jours', 'Téléphone', 'Agent']],
          body: overdueData,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] } // Red for overdue
        });
      } else if (activeTab === 'collection') {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Rapport de Recouvrement', 14, 45);

        const collectionData = loanOfficerPerformance.map(o => [
          o.officer,
          formatCurrency(o.collected.HTG, 'HTG'),
          `${o.repaymentRate}%`,
          o.overdueLoans
        ]);

        (doc as any).autoTable({
          startY: 50,
          head: [['Agent', 'Montant Collecté', 'Taux Remb.', 'Prêts en Retard']],
          body: collectionData,
          theme: 'striped',
          headStyles: { fillColor: [22, 163, 74] } // Green for collection
        });
      }

      doc.save(`rapport-microcredit-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Erreur lors de la génération du PDF');
    }
  };
  
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExportCSV = (tab: string) => {
    try {
      if (tab === 'portfolio') {
        const headers = ['Type', 'Count', 'Total HTG', 'Total USD', 'Outstanding HTG', 'Outstanding USD', 'Avg Interest %'];
        const rows = loanTypePerformance.map(t => [t.type, String(t.count), String(t.totalAmount.HTG || 0), String(t.totalAmount.USD || 0), String(t.outstanding.HTG || 0), String(t.outstanding.USD || 0), String(t.averageInterestRate || 0)]);
        downloadCSV(`rapport-portfolio-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      } else if (tab === 'performance') {
        const headers = ['Branch', 'Total Loans', 'Disbursed HTG', 'Disbursed USD', 'Outstanding HTG', 'Outstanding USD', 'Repayment Rate', 'PAR30'];
        const rows = branchPerformance.map(b => [b.branch, String(b.totalLoans), String(b.disbursed.HTG || 0), String(b.disbursed.USD || 0), String(b.outstanding.HTG || 0), String(b.outstanding.USD || 0), String(b.repaymentRate || 0), String(b.par30 || 0)]);
        downloadCSV(`rapport-performance-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      } else if (tab === 'overdue') {
        const headers = ['LoanNumber', 'CustomerName', 'Amount', 'Currency', 'DaysOverdue', 'DueAmount', 'Phone', 'Officer', 'Branch'];
        const rows = overdueLoans.map(l => [l.loanNumber, `"${l.customerName}"`, String(l.amount), l.currency, String(l.daysOverdue), String(l.dueAmount), String(l.phone), String(l.officer), String(l.branch)]);
        downloadCSV(`rapport-retards-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      } else if (tab === 'collection') {
        const headers = ['Agent', 'Total Loans', 'Active Loans', 'Disbursed HTG', 'Collected HTG', 'Repayment Rate', 'Overdue Loans'];
        const rows = loanOfficerPerformance.map(o => [o.officer, String(o.totalLoans), String(o.activeLoans), String(o.disbursed.HTG || 0), String(o.collected.HTG || 0), String(o.repaymentRate || 0), String(o.overdueLoans || 0)]);
        downloadCSV(`rapport-recouvrement-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      }
      toast.success('Export terminé');
    } catch (err) {
      console.error('Export error', err);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <div className={onClose !== undefined ? "bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col" : "w-full"}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">Rapports de Microcrédits</h2>
          <p className="text-indigo-100">Analyse du portefeuille et performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadReportsData()}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <>
              <button
                onClick={handlePrint}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                title="Imprimer"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleExport('PDF')}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                title="Exporter PDF"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-4">
          {/* First Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Branch Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value as any);
                    if (e.target.value !== 'custom') {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                  <option value="quarter">Ce trimestre</option>
                  <option value="year">Cette année</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>

              {/* Currency Filter */}
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="ALL">Toutes devises</option>
                  <option value="HTG">HTG uniquement</option>
                  <option value="USD">USD uniquement</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => handleExportCSV(activeTab)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>

          {/* Second Row - Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-4 pl-7">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Date début:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Date fin:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => loadReportsData()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Appliquer
              </button>
            </div>
          )}

          {/* Active Filters Display */}
          {(selectedBranch !== 'ALL' || dateRange === 'custom') && (
            <div className="flex items-center gap-2 pl-7">
              <span className="text-sm text-gray-600">Filtres actifs:</span>
              {selectedBranch !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs">
                  {branches.find(b => b.id === selectedBranch)?.name}
                  <button
                    onClick={() => setSelectedBranch('ALL')}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {dateRange === 'custom' && startDate && endDate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-xs">
                  {new Date(startDate).toLocaleDateString('fr-FR')} - {new Date(endDate).toLocaleDateString('fr-FR')}
                  <button
                    onClick={() => {
                      setDateRange('month');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-4 text-gray-600">Chargement des données...</span>
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'portfolio'
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <PieChart className="w-5 h-5 inline-block mr-2" />
              Portefeuille
            </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'performance'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline-block mr-2" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'overdue'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-5 h-5 inline-block mr-2" />
            Retards
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'collection'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Target className="w-5 h-5 inline-block mr-2" />
            Recouvrement
          </button>
        </div>
        </div>
      )}

      {/* Content */}
      {!loading && (
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab: Portfolio Overview */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Prêts</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.totalLoans}</p>
                <p className="text-xs text-gray-600 mt-1">Tous types confondus</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Capital Décaissé</span>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(portfolioMetrics.totalDisbursed.HTG, 'HTG')}
                </p>
                <p className="text-sm text-gray-600">{formatCurrency(portfolioMetrics.totalDisbursed.USD, 'USD')}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Capital Restant</span>
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(portfolioMetrics.totalOutstanding.HTG, 'HTG')}
                </p>
                <p className="text-sm text-gray-600">{formatCurrency(portfolioMetrics.totalOutstanding.USD, 'USD')}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Taux de Remboursement</span>
                  <Percent className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.repaymentRate}%</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Excellent
                </p>
              </div>
            </div>

            {/* Portfolio at Risk */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Portefeuille à Risque (PAR)
                {/* Info tooltip retiré selon demande */}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">PAR Global</p>
                  <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.portfolioAtRisk)}`}>
                    {portfolioMetrics.portfolioAtRisk}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">PAR 30 jours</p>
                  <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.par30)}`}>
                    {portfolioMetrics.par30}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">PAR 60 jours</p>
                  <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.par60)}`}>
                    {portfolioMetrics.par60}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">PAR 90 jours</p>
                  <p className={`text-3xl font-bold ${getPARColor(portfolioMetrics.par90)}`}>
                    {portfolioMetrics.par90}%
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  Le PAR est dans les normes acceptables (&lt;15%). Continuer le suivi des prêts en retard.
                </p>
              </div>
            </div>

            {/* Loan Type Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-600" />
                Distribution par Type de Prêt
              </h3>
              <p className="text-xs text-gray-500 mb-3">Distribution calculée sur les prêts actifs (filtrés par succursale si sélectionnée).</p>
              <div className="space-y-3">
                {loanTypePerformance.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">Aucun prêt trouvé pour les filtres sélectionnés.</p>
                  </div>
                )}
                {(() => {
                  const totalTypesCount = loanTypePerformance.reduce((acc, t) => acc + (t.count || 0), 0);
                  return loanTypePerformance.map((type) => {
                    const percentage = totalTypesCount > 0 ? (type.count / totalTypesCount) * 100 : 0;
                  const typeInfo = getLoanTypeLabel(type.type);
                  return (
                    <div key={type.type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{typeInfo.emoji}</span>
                          <span className="font-semibold text-gray-900">{typeInfo.label}</span>
                          <span className="text-sm text-gray-600">({type.count} prêts)</span>
                        </div>
                          <span className="text-lg font-bold text-gray-900">{percentage.toFixed(1)}%</span>
                      </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div
                          className={`h-3 rounded-full ${getProgressBarColor(type.type)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Montant Total</p>
                          <p className="font-semibold">{formatCurrency(type.totalAmount.HTG, 'HTG')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Taux Moyen</p>
                          <p className="font-semibold">{type.averageInterestRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Remboursement</p>
                          <p className={`font-semibold ${getPerformanceColor(type.repaymentRate)}`}>
                            {type.repaymentRate}%
                          </p>
                        </div>
                      </div>
                    </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Performance */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Branch Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Performance par Succursale
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Succursale</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Prêts</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Décaissé HTG</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Décaissé USD</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Restant HTG</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Restant USD</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taux Remb.</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">PAR 30</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {branchPerformance.map((branch, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">{branch.branch}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                          {branch.totalLoans}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(branch.disbursed.HTG, 'HTG')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(branch.disbursed.USD, 'USD')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(branch.outstanding.HTG, 'HTG')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(branch.outstanding.USD, 'USD')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`font-semibold ${getPerformanceColor(branch.repaymentRate)}`}>
                            {branch.repaymentRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`font-semibold ${getPARColor(branch.par30)}`}>
                            {branch.par30.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Loan Officer Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Performance des Agents de Crédit
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Prêts</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actifs</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Décaissé HTG</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collecté HTG</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taux Remb.</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">En Retard</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loanOfficerPerformance.map((officer, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {officer.repaymentRate >= 95 && <Award className="w-4 h-4 text-yellow-500" />}
                            <span className="font-semibold text-gray-900">{officer.officer}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                          {officer.totalLoans}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 font-semibold">
                          {officer.activeLoans}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(officer.disbursed.HTG, 'HTG')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(officer.collected.HTG, 'HTG')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`font-semibold ${getPerformanceColor(officer.repaymentRate)}`}>
                            {officer.repaymentRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            officer.overdueLoans === 0 ? 'bg-green-100 text-green-800' :
                            officer.overdueLoans <= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {officer.overdueLoans}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Overdue Loans */}
        {activeTab === 'overdue' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">
                <p className="font-medium mb-1">Prêts en Retard</p>
                <p>Liste des prêts nécessitant une action de recouvrement immédiate.</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Détails des Prêts en Retard
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Prêt</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jours Retard</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant Dû</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overdueLoans.map((loan, index) => (
                      <tr key={index} className={
                        loan.daysOverdue >= 60 ? 'bg-red-50' :
                        loan.daysOverdue >= 30 ? 'bg-yellow-50' : 'bg-white'
                      }>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{loan.loanNumber}</span>
                          <p className="text-xs text-gray-500">{loan.branch}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">{loan.customerName}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(loan.amount, loan.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                            loan.daysOverdue >= 60 ? 'bg-red-100 text-red-800' :
                            loan.daysOverdue >= 30 ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            <Clock className="w-4 h-4" />
                            {loan.daysOverdue}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-red-600">
                            {formatCurrency(loan.dueAmount, loan.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{loan.phone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{loan.officer}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Collection */}
        {activeTab === 'collection' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Capital Collecté (30j)</span>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(portfolioMetrics.totalCollected.HTG, 'HTG')}
                </p>
                <p className="text-sm text-gray-600 mt-1">{formatCurrency(portfolioMetrics.totalCollected.USD, 'USD')}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Taux de Collecte</span>
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.repaymentRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600 mt-1">
                  {portfolioMetrics.repaymentRate >= 95 ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Objectif atteint (95%)
                    </span>
                  ) : (
                    <span className="text-orange-600">Objectif: 95%</span>
                  )}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (portfolioMetrics.repaymentRate / 95) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Taux de Défaut</span>
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{portfolioMetrics.defaultRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600 mt-1">
                  {portfolioMetrics.defaultRate <= 5 ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Sous la limite (5%)
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Au-dessus de la limite (5%)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Collection Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Actions de Recouvrement Recommandées
              </h3>
              <div className="space-y-3">
                {/* High Priority - Over 60 days */}
                {overdueLoans.filter(l => l.daysOverdue >= 60).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 mb-1">
                        Priorité HAUTE - {overdueLoans.filter(l => l.daysOverdue >= 60).length} prêts
                      </p>
                      <p className="text-sm text-red-800">
                        Prêts en retard de plus de 60 jours. Contact immédiat requis + visite terrain.
                      </p>
                    </div>
                  </div>
                )}

                {/* Medium Priority - 30-60 days */}
                {overdueLoans.filter(l => l.daysOverdue >= 30 && l.daysOverdue < 60).length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 mb-1">
                        Priorité MOYENNE - {overdueLoans.filter(l => l.daysOverdue >= 30 && l.daysOverdue < 60).length} prêts
                      </p>
                      <p className="text-sm text-yellow-800">
                        Prêts en retard de 30-60 jours. Appel téléphonique + plan de remboursement.
                      </p>
                    </div>
                  </div>
                )}

                {/* Normal Priority - 1-30 days */}
                {overdueLoans.filter(l => l.daysOverdue > 0 && l.daysOverdue < 30).length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">
                        Suivi NORMAL - {overdueLoans.filter(l => l.daysOverdue > 0 && l.daysOverdue < 30).length} prêts
                      </p>
                      <p className="text-sm text-blue-800">
                        Prêts en retard de 1-30 jours. Rappel de paiement par SMS/appel.
                      </p>
                    </div>
                  </div>
                )}

                {/* No overdue loans */}
                {overdueLoans.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900 mb-1">Excellent!</p>
                      <p className="text-sm text-green-800">
                        Aucun prêt en retard. Tous les clients sont à jour dans leurs paiements.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Footer */}
      {onClose && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Rapport généré le {new Date().toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );

  return onClose !== undefined ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {content}
    </div>
  ) : (
    content
  );
};

export default LoanReports;