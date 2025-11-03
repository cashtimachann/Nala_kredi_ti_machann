import React, { useState, useEffect } from 'react';
import {
  User, Phone, Mail, MapPin, Calendar, CreditCard, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, FileText, MessageSquare,
  DollarSign, Clock, Star, Award, Edit, Save, X, Plus,
  Download, Upload, Eye, Trash2, BarChart3, PieChart, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface BorrowerProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  monthlyIncome: number;
  employmentType: string;
  creditScore: number;
  creditScoreDetails: CreditScoreDetails;
  riskAssessment: RiskAssessment;
  createdAt: string;
  updatedAt: string;
  totalLoans: number;
  activeLoans: number;
  totalOutstanding: number;
  lastLoanDate?: string;
  address: Address;
  contact: Contact;
  identity: Identity;
  loans: Loan[];
  savingsAccount?: SavingsAccount;
  documents: Document[];
  notes: Note[];
  interactions: Interaction[];
}

interface CreditScoreDetails {
  score: number;
  factors: CreditFactor[];
  recommendations: string[];
  lastUpdated: string;
}

interface CreditFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface RiskAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  factors: RiskFactor[];
  recommendations: string[];
  nextReviewDate: string;
}

interface RiskFactor {
  category: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  impact: number;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Contact {
  phone: string;
  email?: string;
  emergencyContact: EmergencyContact;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface Identity {
  idType: string;
  idNumber: string;
  expiryDate: string;
  issuingAuthority: string;
}

interface Loan {
  id: string;
  amount: number;
  outstanding: number;
  status: 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  startDate: string;
  endDate: string;
  interestRate: number;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: 'PAID' | 'OVERDUE' | 'MISSED';
}

interface SavingsAccount {
  accountNumber: string;
  balance: number;
  interestRate: number;
  lastTransaction: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  date: string;
  description: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  url: string;
}

interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  category: string;
}

interface Interaction {
  id: string;
  type: 'CALL' | 'VISIT' | 'EMAIL' | 'MEETING';
  date: string;
  description: string;
  outcome: string;
  agent: string;
}

interface ClientProfileProps {
  borrowerId: string;
  onClose: () => void;
}

const ClientProfile: React.FC<ClientProfileProps> = ({ borrowerId, onClose }) => {
  const [profile, setProfile] = useState<BorrowerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'savings' | 'documents' | 'notes' | 'interactions'>('overview');
  const [editing, setEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newInteraction, setNewInteraction] = useState({
    type: 'CALL' as const,
    description: '',
    outcome: ''
  });

  useEffect(() => {
    loadProfile();
  }, [borrowerId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Try to fetch from API first
      const response = await fetch(`/api/MicrocreditBorrower/${borrowerId}/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        // Fallback to demo data
        const demoProfile: BorrowerProfile = {
          id: borrowerId,
          firstName: 'Jean',
          lastName: 'Baptiste',
          fullName: 'Jean Baptiste',
          dateOfBirth: '1985-03-15',
          gender: 'M',
          occupation: 'Commerçant',
          monthlyIncome: 45000,
          employmentType: 'Self-employed',
          creditScore: 720,
          creditScoreDetails: {
            score: 720,
            factors: [
              { name: 'Payment History', score: 85, weight: 35, description: 'Excellent payment record' },
              { name: 'Credit Utilization', score: 75, weight: 30, description: 'Good credit utilization' },
              { name: 'Length of Credit', score: 70, weight: 15, description: 'Established credit history' },
              { name: 'New Credit', score: 80, weight: 10, description: 'Limited new credit inquiries' },
              { name: 'Credit Mix', score: 65, weight: 10, description: 'Diverse credit types' }
            ],
            recommendations: [
              'Continue maintaining excellent payment history',
              'Consider reducing credit utilization below 30%',
              'Monitor credit inquiries'
            ],
            lastUpdated: '2024-01-15T10:00:00'
          },
          riskAssessment: {
            level: 'LOW',
            factors: [
              { category: 'Payment Risk', level: 'LOW', description: 'Consistent payment history', impact: -10 },
              { category: 'Income Stability', level: 'MEDIUM', description: 'Variable self-employment income', impact: 5 },
              { category: 'Debt Load', level: 'LOW', description: 'Manageable debt-to-income ratio', impact: -5 },
              { category: 'Market Conditions', level: 'MEDIUM', description: 'Affected by local economic factors', impact: 3 }
            ],
            recommendations: [
              'Monitor income stability',
              'Consider diversifying income sources',
              'Regular credit score reviews'
            ],
            nextReviewDate: '2024-04-15T00:00:00'
          },
          createdAt: '2024-01-15T10:00:00',
          updatedAt: '2024-01-15T10:00:00',
          totalLoans: 3,
          activeLoans: 1,
          totalOutstanding: 85000,
          lastLoanDate: '2024-10-01T00:00:00',
          address: {
            street: '123 Rue de la Paix',
            city: 'Port-au-Prince',
            state: 'Ouest',
            zipCode: 'HT6110',
            country: 'Haïti'
          },
          contact: {
            phone: '+509 1234 5678',
            email: 'jean.baptiste@email.com',
            emergencyContact: {
              name: 'Marie Baptiste',
              phone: '+509 8765 4321',
              relationship: 'Épouse'
            }
          },
          identity: {
            idType: 'Carte d\'Identité',
            idNumber: '001-234-5678',
            expiryDate: '2028-03-15',
            issuingAuthority: 'Office National d\'Identification'
          },
          loans: [
            {
              id: 'L001',
              amount: 100000,
              outstanding: 85000,
              status: 'ACTIVE',
              startDate: '2024-10-01',
              endDate: '2025-10-01',
              interestRate: 2.5,
              payments: [
                { id: 'P001', amount: 15000, date: '2024-11-01', status: 'PAID' },
                { id: 'P002', amount: 15000, date: '2024-12-01', status: 'PAID' },
                { id: 'P003', amount: 15000, date: '2025-01-01', status: 'OVERDUE' }
              ]
            }
          ],
          savingsAccount: {
            accountNumber: 'SA001234',
            balance: 25000,
            interestRate: 3.5,
            lastTransaction: '2024-01-10T14:30:00',
            transactions: [
              { id: 'T001', type: 'DEPOSIT', amount: 10000, date: '2024-01-05', description: 'Dépôt initial' },
              { id: 'T002', type: 'DEPOSIT', amount: 15000, date: '2024-01-10', description: 'Épargne mensuelle' }
            ]
          },
          documents: [
            {
              id: 'D001',
              name: 'Carte d\'Identité',
              type: 'ID',
              uploadDate: '2024-01-15',
              url: '/documents/id_jean_baptiste.pdf'
            },
            {
              id: 'D002',
              name: 'Justificatif de domicile',
              type: 'ADDRESS',
              uploadDate: '2024-01-15',
              url: '/documents/address_jean_baptiste.pdf'
            }
          ],
          notes: [
            {
              id: 'N001',
              content: 'Client très fiable, toujours à jour dans ses paiements. Bonne relation avec l\'institution.',
              createdBy: 'Marie Joseph',
              createdAt: '2024-01-10T09:00:00',
              category: 'GENERAL'
            }
          ],
          interactions: [
            {
              id: 'I001',
              type: 'CALL',
              date: '2024-01-08T10:00:00',
              description: 'Appel pour vérifier les informations de contact',
              outcome: 'Informations mises à jour',
              agent: 'Marie Joseph'
            }
          ]
        };
        setProfile(demoProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;

    try {
      // Simulate API call
      const note: Note = {
        id: `N${Date.now()}`,
        content: newNote,
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        category: 'GENERAL'
      };

      setProfile(prev => prev ? {
        ...prev,
        notes: [note, ...prev.notes]
      } : null);

      setNewNote('');
      toast.success('Note ajoutée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de la note');
    }
  };

  const handleSaveInteraction = async () => {
    if (!newInteraction.description.trim()) return;

    try {
      // Simulate API call
      const interaction: Interaction = {
        id: `I${Date.now()}`,
        type: newInteraction.type,
        date: new Date().toISOString(),
        description: newInteraction.description,
        outcome: newInteraction.outcome,
        agent: 'Current User'
      };

      setProfile(prev => prev ? {
        ...prev,
        interactions: [interaction, ...prev.interactions]
      } : null);

      setNewInteraction({ type: 'CALL', description: '', outcome: '' });
      toast.success('Interaction enregistrée');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-blue-600';
    if (score >= 550) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'VERY_HIGH': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskFactorColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'HIGH': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-center text-red-600">Erreur lors du chargement du profil</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.fullName}</h2>
              <p className="text-gray-600">{profile.occupation}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getCreditScoreColor(profile.creditScore)}`}>
                {profile.creditScore}
              </div>
              <div className="text-sm text-gray-500">Score Crédit</div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { id: 'overview', label: 'Aperçu', icon: User },
              { id: 'loans', label: 'Prêts', icon: CreditCard },
              { id: 'savings', label: 'Épargne', icon: DollarSign },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'notes', label: 'Notes', icon: MessageSquare },
              { id: 'interactions', label: 'Interactions', icon: Activity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)]">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informations Personnelles
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nom complet:</span>
                      <span className="font-medium">{profile.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de naissance:</span>
                      <span className="font-medium">{formatDate(profile.dateOfBirth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Genre:</span>
                      <span className="font-medium">{profile.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profession:</span>
                      <span className="font-medium">{profile.occupation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type d'emploi:</span>
                      <span className="font-medium">{profile.employmentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenu mensuel:</span>
                      <span className="font-medium">{formatCurrency(profile.monthlyIncome)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Adresse & Contact
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600">Adresse:</span>
                      <p className="font-medium mt-1">
                        {profile.address.street}<br />
                        {profile.address.city}, {profile.address.state} {profile.address.zipCode}<br />
                        {profile.address.country}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Téléphone:</span>
                      <span className="font-medium">{profile.contact.phone}</span>
                    </div>
                    {profile.contact.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{profile.contact.email}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Contact d'urgence:</span>
                      <p className="font-medium mt-1">
                        {profile.contact.emergencyContact.name}<br />
                        {profile.contact.emergencyContact.phone} ({profile.contact.emergencyContact.relationship})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit Score & Risk Assessment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-blue-600" />
                    Score de Crédit
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getCreditScoreColor(profile.creditScore)}`}>
                        {profile.creditScore}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Dernière mise à jour: {formatDate(profile.creditScoreDetails.lastUpdated)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {profile.creditScoreDetails.factors.map((factor, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{factor.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${factor.score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{factor.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommandations:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {profile.creditScoreDetails.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Évaluation des Risques
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(profile.riskAssessment.level)}`}>
                        {profile.riskAssessment.level === 'LOW' ? 'Faible' :
                         profile.riskAssessment.level === 'MEDIUM' ? 'Moyen' :
                         profile.riskAssessment.level === 'HIGH' ? 'Élevé' : 'Très Élevé'}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Prochaine revue: {formatDate(profile.riskAssessment.nextReviewDate)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {profile.riskAssessment.factors.map((factor, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{factor.category}</span>
                          <span className={`text-sm font-medium ${getRiskFactorColor(factor.level)}`}>
                            {factor.level === 'LOW' ? 'Faible' :
                             factor.level === 'MEDIUM' ? 'Moyen' : 'Élevé'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommandations:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {profile.riskAssessment.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Summary */}
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Résumé des Prêts
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile.totalLoans}</div>
                    <div className="text-sm text-gray-600">Total Prêts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{profile.activeLoans}</div>
                    <div className="text-sm text-gray-600">Prêts Actifs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(profile.totalOutstanding)}</div>
                    <div className="text-sm text-gray-600">Encours Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {profile.lastLoanDate ? formatDate(profile.lastLoanDate) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Dernier Prêt</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'loans' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Historique des Prêts</h3>
              <div className="space-y-4">
                {profile.loans.map((loan) => (
                  <div key={loan.id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold">Prêt #{loan.id}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(loan.startDate)} - {formatDate(loan.endDate)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        loan.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {loan.status === 'ACTIVE' ? 'Actif' :
                         loan.status === 'COMPLETED' ? 'Terminé' : 'Défaillant'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">Montant initial</span>
                        <p className="font-medium">{formatCurrency(loan.amount)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Encours</span>
                        <p className="font-medium">{formatCurrency(loan.outstanding)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Taux d'intérêt</span>
                        <p className="font-medium">{loan.interestRate}%</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Paiements</span>
                        <p className="font-medium">
                          {loan.payments.filter(p => p.status === 'PAID').length}/{loan.payments.length}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Historique des paiements</h5>
                      <div className="space-y-2">
                        {loan.payments.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center bg-white p-3 rounded">
                            <div>
                              <span className="font-medium">{formatCurrency(payment.amount)}</span>
                              <span className="text-sm text-gray-600 ml-2">{formatDate(payment.date)}</span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'PAID' ? 'bg-green-100 text-green-800' :
                              payment.status === 'OVERDUE' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {payment.status === 'PAID' ? 'Payé' :
                               payment.status === 'OVERDUE' ? 'En retard' : 'Manqué'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'savings' && profile.savingsAccount && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Compte d'Épargne</h3>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Numéro de compte</span>
                    <p className="font-medium">{profile.savingsAccount.accountNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Solde actuel</span>
                    <p className="font-medium text-green-600">{formatCurrency(profile.savingsAccount.balance)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Taux d'intérêt</span>
                    <p className="font-medium">{profile.savingsAccount.interestRate}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Dernière transaction</span>
                    <p className="font-medium">{formatDate(profile.savingsAccount.lastTransaction)}</p>
                  </div>
                </div>
              </div>

              <h4 className="font-semibold mb-4">Historique des transactions</h4>
              <div className="space-y-2">
                {profile.savingsAccount.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center bg-white p-4 rounded-lg border">
                    <div>
                      <span className={`font-medium ${
                        transaction.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                      <p className="text-sm text-gray-600">{transaction.description}</p>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(transaction.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Documents</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  <Upload className="w-4 h-4" />
                  Ajouter un document
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.documents.map((document) => (
                  <div key={document.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-gray-600" />
                      <div>
                        <h4 className="font-medium">{document.name}</h4>
                        <p className="text-sm text-gray-600">
                          {document.type} • {formatDate(document.uploadDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-gray-600 hover:text-gray-800">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-800">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Notes</h3>
                <button
                  onClick={() => setEditing(!editing)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle note
                </button>
              </div>

              {editing && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Saisissez votre note..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={4}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setNewNote('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveNote}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {profile.notes.map((note) => (
                  <div key={note.id} className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{note.createdBy}</span>
                      <span className="text-sm text-gray-500">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-gray-700">{note.content}</p>
                    <span className="text-xs text-gray-500 mt-2 block">{note.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interactions' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Interactions</h3>
                <button
                  onClick={() => setEditing(!editing)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle interaction
                </button>
              </div>

              {editing && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type d'interaction
                      </label>
                      <select
                        value={newInteraction.type}
                        onChange={(e) => setNewInteraction(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="CALL">Appel téléphonique</option>
                        <option value="VISIT">Visite</option>
                        <option value="EMAIL">Email</option>
                        <option value="MEETING">Réunion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Résultat
                      </label>
                      <input
                        type="text"
                        value={newInteraction.outcome}
                        onChange={(e) => setNewInteraction(prev => ({ ...prev, outcome: e.target.value }))}
                        placeholder="Résultat de l'interaction"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newInteraction.description}
                      onChange={(e) => setNewInteraction(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Décrivez l'interaction..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setNewInteraction({ type: 'CALL', description: '', outcome: '' });
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveInteraction}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {profile.interactions.map((interaction) => (
                  <div key={interaction.id} className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          interaction.type === 'CALL' ? 'bg-blue-100 text-blue-800' :
                          interaction.type === 'VISIT' ? 'bg-green-100 text-green-800' :
                          interaction.type === 'EMAIL' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {interaction.type === 'CALL' ? 'Appel' :
                           interaction.type === 'VISIT' ? 'Visite' :
                           interaction.type === 'EMAIL' ? 'Email' : 'Réunion'}
                        </span>
                        <span className="font-medium">{interaction.agent}</span>
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(interaction.date)}</span>
                    </div>
                    <p className="text-gray-700 mb-2">{interaction.description}</p>
                    <p className="text-sm text-gray-600">
                      <strong>Résultat:</strong> {interaction.outcome}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;