import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, UserCheck, UserX, Users, AlertTriangle,
  Calculator, Save, X, CheckCircle, Clock, Search,
  Filter, MoreVertical, Eye, Trash2, UserPlus, Settings,
  Mail, Phone, MapPin, Calendar, DollarSign, Star
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface Borrower {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
  monthlyIncome: number;
  employmentType: string;
  creditScore?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  status: 'ACTIVE' | 'INACTIVE';
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;
  address: Address;
  contact: Contact;
  identity: Identity;
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

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  activeClients: number;
}

interface ClientAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'ASSIGN_AGENT' | 'CALCULATE_RISK';
  borrowerId: string;
  borrowerName: string;
  description: string;
  performedBy: string;
  performedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  details?: any;
}

const ClientActions: React.FC = () => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentActions, setRecentActions] = useState<ClientAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [processing, setProcessing] = useState<string | null>(null);

  // Form states
  const [clientForm, setClientForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'M',
    occupation: '',
    monthlyIncome: '',
    employmentType: 'Self-employed',
    phone: '',
    email: '',
    street: '',
    city: 'Port-au-Prince',
    state: 'Ouest',
    zipCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    idType: 'Carte d\'Identité',
    idNumber: '',
    idExpiryDate: '',
    idIssuingAuthority: 'Office National d\'Identification'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load borrowers
      const borrowersResponse = await fetch('/api/MicrocreditBorrower', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (borrowersResponse.ok) {
        const borrowersData = await borrowersResponse.json();
        setBorrowers(borrowersData.borrowers || []);
      } else {
        // Fallback demo data
        const demoBorrowers: Borrower[] = [
          {
            id: '1',
            firstName: 'Jean',
            lastName: 'Baptiste',
            fullName: 'Jean Baptiste',
            dateOfBirth: '1985-03-15',
            gender: 'M',
            occupation: 'Commerçant',
            monthlyIncome: 45000,
            employmentType: 'Self-employed',
            creditScore: 720,
            riskLevel: 'LOW',
            status: 'ACTIVE',
            assignedAgent: 'Marie Joseph',
            createdAt: '2024-01-15T10:00:00',
            updatedAt: '2024-01-15T10:00:00',
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
            }
          },
          {
            id: '2',
            firstName: 'Marie',
            lastName: 'Jeanne',
            fullName: 'Marie Jeanne',
            dateOfBirth: '1990-07-22',
            gender: 'F',
            occupation: 'Enseignante',
            monthlyIncome: 35000,
            employmentType: 'Employed',
            creditScore: 680,
            riskLevel: 'LOW',
            status: 'ACTIVE',
            assignedAgent: 'Pierre Louis',
            createdAt: '2024-02-20T14:30:00',
            updatedAt: '2024-02-20T14:30:00',
            address: {
              street: '456 Avenue des Palmiers',
              city: 'Port-au-Prince',
              state: 'Ouest',
              zipCode: 'HT6110',
              country: 'Haïti'
            },
            contact: {
              phone: '+509 2345 6789',
              email: 'marie.jeanne@email.com',
              emergencyContact: {
                name: 'Pierre Jeanne',
                phone: '+509 3456 7890',
                relationship: 'Frère'
              }
            },
            identity: {
              idType: 'Carte d\'Identité',
              idNumber: '002-345-6789',
              expiryDate: '2029-07-22',
              issuingAuthority: 'Office National d\'Identification'
            }
          }
        ];
        setBorrowers(demoBorrowers);
      }

      // Load agents
      const demoAgents: Agent[] = [
        { id: '1', name: 'Marie Joseph', email: 'marie.joseph@credit.com', role: 'Senior Agent', activeClients: 45 },
        { id: '2', name: 'Pierre Louis', email: 'pierre.louis@credit.com', role: 'Agent', activeClients: 32 },
        { id: '3', name: 'Sophie Michel', email: 'sophie.michel@credit.com', role: 'Agent', activeClients: 28 }
      ];
      setAgents(demoAgents);

      // Load recent actions
      const demoActions: ClientAction[] = [
        {
          id: '1',
          type: 'CREATE',
          borrowerId: '1',
          borrowerName: 'Jean Baptiste',
          description: 'Création du profil client',
          performedBy: 'Marie Joseph',
          performedAt: '2024-01-15T10:00:00',
          status: 'SUCCESS'
        },
        {
          id: '2',
          type: 'ASSIGN_AGENT',
          borrowerId: '2',
          borrowerName: 'Marie Jeanne',
          description: 'Assignation à l\'agent Pierre Louis',
          performedBy: 'Admin',
          performedAt: '2024-02-20T14:30:00',
          status: 'SUCCESS'
        }
      ];
      setRecentActions(demoActions);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!validateClientForm()) return;

    try {
      setProcessing('add');

      const newClient = {
        firstName: clientForm.firstName,
        lastName: clientForm.lastName,
        dateOfBirth: clientForm.dateOfBirth,
        gender: clientForm.gender,
        occupation: clientForm.occupation,
        monthlyIncome: parseInt(clientForm.monthlyIncome),
        employmentType: clientForm.employmentType,
        address: {
          street: clientForm.street,
          city: clientForm.city,
          state: clientForm.state,
          zipCode: clientForm.zipCode,
          country: 'Haïti'
        },
        contact: {
          phone: clientForm.phone,
          email: clientForm.email || undefined,
          emergencyContact: {
            name: clientForm.emergencyContactName,
            phone: clientForm.emergencyContactPhone,
            relationship: clientForm.emergencyContactRelationship
          }
        },
        identity: {
          idType: clientForm.idType,
          idNumber: clientForm.idNumber,
          expiryDate: clientForm.idExpiryDate,
          issuingAuthority: clientForm.idIssuingAuthority
        }
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const createdClient: Borrower = {
        id: `client-${Date.now()}`,
        ...newClient,
        fullName: `${newClient.firstName} ${newClient.lastName}`,
        creditScore: undefined,
        riskLevel: 'MEDIUM',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setBorrowers(prev => [createdClient, ...prev]);

      // Add action
      const action: ClientAction = {
        id: `action-${Date.now()}`,
        type: 'CREATE',
        borrowerId: createdClient.id,
        borrowerName: createdClient.fullName,
        description: 'Création du profil client',
        performedBy: 'Current User',
        performedAt: new Date().toISOString(),
        status: 'SUCCESS'
      };
      setRecentActions(prev => [action, ...prev]);

      resetClientForm();
      setShowAddClient(false);
      toast.success('Client ajouté avec succès');

    } catch (error) {
      toast.error('Erreur lors de l\'ajout du client');
    } finally {
      setProcessing(null);
    }
  };

  const handleEditClient = async () => {
    if (!selectedBorrower || !validateClientForm()) return;

    try {
      setProcessing('edit');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const updatedClient: Borrower = {
        ...selectedBorrower,
        firstName: clientForm.firstName,
        lastName: clientForm.lastName,
        dateOfBirth: clientForm.dateOfBirth,
        gender: clientForm.gender,
        occupation: clientForm.occupation,
        monthlyIncome: parseInt(clientForm.monthlyIncome),
        employmentType: clientForm.employmentType,
        address: {
          ...selectedBorrower.address,
          street: clientForm.street,
          city: clientForm.city,
          state: clientForm.state,
          zipCode: clientForm.zipCode
        },
        contact: {
          ...selectedBorrower.contact,
          phone: clientForm.phone,
          email: clientForm.email || undefined,
          emergencyContact: {
            ...selectedBorrower.contact.emergencyContact,
            name: clientForm.emergencyContactName,
            phone: clientForm.emergencyContactPhone,
            relationship: clientForm.emergencyContactRelationship
          }
        },
        identity: {
          ...selectedBorrower.identity,
          idType: clientForm.idType,
          idNumber: clientForm.idNumber,
          expiryDate: clientForm.idExpiryDate,
          issuingAuthority: clientForm.idIssuingAuthority
        },
        fullName: `${clientForm.firstName} ${clientForm.lastName}`,
        updatedAt: new Date().toISOString()
      };

      setBorrowers(prev => prev.map(b => b.id === selectedBorrower.id ? updatedClient : b));

      // Add action
      const action: ClientAction = {
        id: `action-${Date.now()}`,
        type: 'UPDATE',
        borrowerId: updatedClient.id,
        borrowerName: updatedClient.fullName,
        description: 'Modification du profil client',
        performedBy: 'Current User',
        performedAt: new Date().toISOString(),
        status: 'SUCCESS'
      };
      setRecentActions(prev => [action, ...prev]);

      setShowEditClient(false);
      setSelectedBorrower(null);
      resetClientForm();
      toast.success('Client modifié avec succès');

    } catch (error) {
      toast.error('Erreur lors de la modification du client');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleStatus = async (borrower: Borrower) => {
    try {
      setProcessing(`status-${borrower.id}`);

      const newStatus = borrower.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setBorrowers(prev => prev.map(b =>
        b.id === borrower.id
          ? { ...b, status: newStatus, updatedAt: new Date().toISOString() }
          : b
      ));

      // Add action
      const action: ClientAction = {
        id: `action-${Date.now()}`,
        type: newStatus === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE',
        borrowerId: borrower.id,
        borrowerName: borrower.fullName,
        description: `${newStatus === 'ACTIVE' ? 'Activation' : 'Désactivation'} du client`,
        performedBy: 'Current User',
        performedAt: new Date().toISOString(),
        status: 'SUCCESS'
      };
      setRecentActions(prev => [action, ...prev]);

      toast.success(`Client ${newStatus === 'ACTIVE' ? 'activé' : 'désactivé'} avec succès`);

    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    } finally {
      setProcessing(null);
    }
  };

  const handleAssignAgent = async (borrower: Borrower, agentId: string) => {
    try {
      setProcessing(`assign-${borrower.id}`);

      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setBorrowers(prev => prev.map(b =>
        b.id === borrower.id
          ? { ...b, assignedAgent: agent.name, updatedAt: new Date().toISOString() }
          : b
      ));

      // Add action
      const action: ClientAction = {
        id: `action-${Date.now()}`,
        type: 'ASSIGN_AGENT',
        borrowerId: borrower.id,
        borrowerName: borrower.fullName,
        description: `Assignation à l'agent ${agent.name}`,
        performedBy: 'Current User',
        performedAt: new Date().toISOString(),
        status: 'SUCCESS'
      };
      setRecentActions(prev => [action, ...prev]);

      toast.success('Agent assigné avec succès');

    } catch (error) {
      toast.error('Erreur lors de l\'assignation de l\'agent');
    } finally {
      setProcessing(null);
    }
  };

  const handleCalculateRisk = async (borrower: Borrower) => {
    try {
      setProcessing(`risk-${borrower.id}`);

      // Simulate risk calculation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newCreditScore = Math.floor(Math.random() * 300) + 550; // 550-850
      const newRiskLevel = newCreditScore >= 750 ? 'LOW' :
                          newCreditScore >= 650 ? 'MEDIUM' :
                          newCreditScore >= 550 ? 'HIGH' : 'VERY_HIGH';

      setBorrowers(prev => prev.map(b =>
        b.id === borrower.id
          ? { ...b, creditScore: newCreditScore, riskLevel: newRiskLevel as any, updatedAt: new Date().toISOString() }
          : b
      ));

      // Add action
      const action: ClientAction = {
        id: `action-${Date.now()}`,
        type: 'CALCULATE_RISK',
        borrowerId: borrower.id,
        borrowerName: borrower.fullName,
        description: `Recalcul du score de crédit: ${newCreditScore}`,
        performedBy: 'Current User',
        performedAt: new Date().toISOString(),
        status: 'SUCCESS'
      };
      setRecentActions(prev => [action, ...prev]);

      toast.success('Score de crédit recalculé avec succès');

    } catch (error) {
      toast.error('Erreur lors du calcul du risque');
    } finally {
      setProcessing(null);
    }
  };

  const validateClientForm = () => {
    if (!clientForm.firstName.trim() || !clientForm.lastName.trim()) {
      toast.error('Le nom et prénom sont requis');
      return false;
    }
    if (!clientForm.dateOfBirth) {
      toast.error('La date de naissance est requise');
      return false;
    }
    if (!clientForm.phone.trim()) {
      toast.error('Le numéro de téléphone est requis');
      return false;
    }
    if (!clientForm.occupation.trim()) {
      toast.error('La profession est requise');
      return false;
    }
    if (!clientForm.monthlyIncome || parseInt(clientForm.monthlyIncome) <= 0) {
      toast.error('Le revenu mensuel doit être supérieur à 0');
      return false;
    }
    return true;
  };

  const resetClientForm = () => {
    setClientForm({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'M',
      occupation: '',
      monthlyIncome: '',
      employmentType: 'Self-employed',
      phone: '',
      email: '',
      street: '',
      city: 'Port-au-Prince',
      state: 'Ouest',
      zipCode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      idType: 'Carte d\'Identité',
      idNumber: '',
      idExpiryDate: '',
      idIssuingAuthority: 'Office National d\'Identification'
    });
  };

  const openEditClient = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setClientForm({
      firstName: borrower.firstName,
      lastName: borrower.lastName,
      dateOfBirth: borrower.dateOfBirth.split('T')[0],
      gender: borrower.gender,
      occupation: borrower.occupation,
      monthlyIncome: borrower.monthlyIncome.toString(),
      employmentType: borrower.employmentType,
      phone: borrower.contact.phone,
      email: borrower.contact.email || '',
      street: borrower.address.street,
      city: borrower.address.city,
      state: borrower.address.state,
      zipCode: borrower.address.zipCode,
      emergencyContactName: borrower.contact.emergencyContact.name,
      emergencyContactPhone: borrower.contact.emergencyContact.phone,
      emergencyContactRelationship: borrower.contact.emergencyContact.relationship,
      idType: borrower.identity.idType,
      idNumber: borrower.identity.idNumber,
      idExpiryDate: borrower.identity.expiryDate.split('T')[0],
      idIssuingAuthority: borrower.identity.issuingAuthority
    });
    setShowEditClient(true);
  };

  const filteredBorrowers = borrowers.filter(borrower => {
    const matchesSearch = borrower.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         borrower.occupation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || borrower.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'VERY_HIGH': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'CREATE': return <Plus className="w-4 h-4" />;
      case 'UPDATE': return <Edit className="w-4 h-4" />;
      case 'ACTIVATE': return <UserCheck className="w-4 h-4" />;
      case 'DEACTIVATE': return <UserX className="w-4 h-4" />;
      case 'ASSIGN_AGENT': return <Users className="w-4 h-4" />;
      case 'CALCULATE_RISK': return <Calculator className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'CREATE': return 'text-green-600 bg-green-100';
      case 'UPDATE': return 'text-blue-600 bg-blue-100';
      case 'ACTIVATE': return 'text-green-600 bg-green-100';
      case 'DEACTIVATE': return 'text-red-600 bg-red-100';
      case 'ASSIGN_AGENT': return 'text-purple-600 bg-purple-100';
      case 'CALCULATE_RISK': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Actions Clients</h1>
          <p className="text-gray-600 mt-1">Gestion et actions sur les clients</p>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau Client
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{borrowers.length}</span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Total Clients</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {borrowers.filter(b => b.status === 'ACTIVE').length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Clients Actifs</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calculator className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {borrowers.filter(b => b.creditScore).length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Scores Calculés</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {borrowers.filter(b => b.riskLevel === 'HIGH' || b.riskLevel === 'VERY_HIGH').length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">À Risque Élevé</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score/Risque
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent Assigné
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBorrowers.map((borrower) => (
                <tr key={borrower.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <Users className="h-6 w-6 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{borrower.fullName}</div>
                        <div className="text-sm text-gray-500">{borrower.occupation}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{borrower.contact.phone}</div>
                    {borrower.contact.email && (
                      <div className="text-sm text-gray-500">{borrower.contact.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {borrower.creditScore ? (
                        <div className="text-sm font-medium text-gray-900">{borrower.creditScore}</div>
                      ) : (
                        <div className="text-sm text-gray-500">Non calculé</div>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(borrower.riskLevel)}`}>
                        {borrower.riskLevel === 'LOW' ? 'Faible' :
                         borrower.riskLevel === 'MEDIUM' ? 'Moyen' :
                         borrower.riskLevel === 'HIGH' ? 'Élevé' : 'Très Élevé'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{borrower.assignedAgent || 'Non assigné'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      borrower.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {borrower.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditClient(borrower)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(borrower)}
                        disabled={processing === `status-${borrower.id}`}
                        className={`${
                          borrower.status === 'ACTIVE'
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        } ${processing === `status-${borrower.id}` ? 'opacity-50' : ''}`}
                        title={borrower.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                      >
                        {borrower.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleCalculateRisk(borrower)}
                        disabled={processing === `risk-${borrower.id}`}
                        className={`text-orange-600 hover:text-orange-700 ${processing === `risk-${borrower.id}` ? 'opacity-50' : ''}`}
                        title="Calculer le risque"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button className="text-gray-600 hover:text-gray-700">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                          <div className="py-1">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignAgent(borrower, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              defaultValue=""
                            >
                              <option value="">Assigner un agent...</option>
                              {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.name} ({agent.activeClients} clients)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Actions Récentes</h3>
        <div className="space-y-3">
          {recentActions.slice(0, 10).map((action) => (
            <div key={action.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-lg ${getActionColor(action.type)}`}>
                {getActionIcon(action.type)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{action.description}</div>
                <div className="text-xs text-gray-600">
                  {action.borrowerName} • {action.performedBy} • {formatDate(action.performedAt)}
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                action.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                action.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {action.status === 'SUCCESS' ? 'Succès' :
                 action.status === 'FAILED' ? 'Échec' : 'En cours'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      {(showAddClient || showEditClient) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {showAddClient ? 'Nouveau Client' : 'Modifier Client'}
              </h2>
              <button
                onClick={() => {
                  setShowAddClient(false);
                  setShowEditClient(false);
                  setSelectedBorrower(null);
                  resetClientForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={clientForm.firstName}
                    onChange={(e) => setClientForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={clientForm.lastName}
                    onChange={(e) => setClientForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    value={clientForm.dateOfBirth}
                    onChange={(e) => setClientForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genre
                  </label>
                  <select
                    value={clientForm.gender}
                    onChange={(e) => setClientForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profession *
                  </label>
                  <input
                    type="text"
                    value={clientForm.occupation}
                    onChange={(e) => setClientForm(prev => ({ ...prev, occupation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'emploi
                  </label>
                  <select
                    value={clientForm.employmentType}
                    onChange={(e) => setClientForm(prev => ({ ...prev, employmentType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Employed">Salarié</option>
                    <option value="Self-employed">Indépendant</option>
                    <option value="Unemployed">Sans emploi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenu mensuel (HTG) *
                  </label>
                  <input
                    type="number"
                    value={clientForm.monthlyIncome}
                    onChange={(e) => setClientForm(prev => ({ ...prev, monthlyIncome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={clientForm.street}
                    onChange={(e) => setClientForm(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="Rue, numéro..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={clientForm.city}
                    onChange={(e) => setClientForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={clientForm.zipCode}
                    onChange={(e) => setClientForm(prev => ({ ...prev, zipCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact d'urgence - Nom
                  </label>
                  <input
                    type="text"
                    value={clientForm.emergencyContactName}
                    onChange={(e) => setClientForm(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone d'urgence
                  </label>
                  <input
                    type="tel"
                    value={clientForm.emergencyContactPhone}
                    onChange={(e) => setClientForm(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relation
                  </label>
                  <input
                    type="text"
                    value={clientForm.emergencyContactRelationship}
                    onChange={(e) => setClientForm(prev => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                    placeholder="Ex: Épouse, Frère..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de pièce d'identité
                  </label>
                  <select
                    value={clientForm.idType}
                    onChange={(e) => setClientForm(prev => ({ ...prev, idType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Carte d'Identité">Carte d'Identité</option>
                    <option value="Passeport">Passeport</option>
                    <option value="Permis de conduire">Permis de conduire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de pièce
                  </label>
                  <input
                    type="text"
                    value={clientForm.idNumber}
                    onChange={(e) => setClientForm(prev => ({ ...prev, idNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'expiration
                  </label>
                  <input
                    type="date"
                    value={clientForm.idExpiryDate}
                    onChange={(e) => setClientForm(prev => ({ ...prev, idExpiryDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Autorité émettrice
                  </label>
                  <input
                    type="text"
                    value={clientForm.idIssuingAuthority}
                    onChange={(e) => setClientForm(prev => ({ ...prev, idIssuingAuthority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddClient(false);
                    setShowEditClient(false);
                    setSelectedBorrower(null);
                    resetClientForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={showAddClient ? handleAddClient : handleEditClient}
                  disabled={processing === 'add' || processing === 'edit'}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {processing === 'add' || processing === 'edit' ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {showAddClient ? 'Ajout en cours...' : 'Modification...'}
                    </div>
                  ) : (
                    showAddClient ? 'Ajouter le client' : 'Modifier le client'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientActions;