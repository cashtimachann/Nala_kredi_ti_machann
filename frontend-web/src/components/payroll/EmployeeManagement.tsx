import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  MapPin,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  Employee, 
  CreateEmployeeDto, 
  UpdateEmployeeDto, 
  EmployeeSearchDto,
  EmployeeStatus,
  EmployeeFunction,
  formatEmployeeFunction,
  formatEmployeeStatus
} from '../../types/payroll';
import apiService from '../../services/apiService';
import EmployeeForm from './EmployeeForm';
import toast from 'react-hot-toast';

interface EmployeeManagementProps {
  branchId?: string;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ branchId }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | ''>('');
  const [functionFilter, setFunctionFilter] = useState<EmployeeFunction | ''>('');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [branchId, statusFilter, functionFilter, searchTerm]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const searchDto: EmployeeSearchDto = {
        branchId,
        status: statusFilter || undefined,
        function: functionFilter || undefined,
        searchTerm: searchTerm.trim() || undefined
      };
      const data = await apiService.getEmployees(searchDto);
      // Map backend EmployeeDto to frontend Employee type
      const mapped = data.map((e: any) => ({
        id: e.id,
        employeeNumber: e.employeeNumber || e.employeeCode || '',
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phoneNumber: e.phoneNumber,
        nationalId: e.nationalId,
        dateOfBirth: e.dateOfBirth || '',
        hireDate: e.hireDate,
        terminationDate: e.terminationDate,
        function: e.function ?? e.position ?? '',
        functionName: e.functionName ?? e.positionName ?? '',
        status: e.status,
        statusName: e.statusName,
        branchId: e.branchId,
        branchName: e.branchName,
        baseSalary: e.baseSalary,
        currency: e.currency,
        bankAccountNumber: e.bankAccountNumber || e.bankAccount || '',
        bankName: e.bankName,
        address: e.address,
        emergencyContactName: e.emergencyContactName || '',
        emergencyContactPhone: e.emergencyContactPhone || '',
        isActive: e.isActive ?? (e.status === 0),
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        createdBy: e.createdBy,
        updatedBy: e.updatedBy,
      }));
      setEmployees(mapped);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'employé ${employee.firstName} ${employee.lastName}?`)) {
      return;
    }

    try {
      await apiService.deleteEmployee(employee.id);
      toast.success('Employé supprimé avec succès');
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEmployeeSubmit = async (employeeData: CreateEmployeeDto | UpdateEmployeeDto) => {
    try {
      if (editingEmployee) {
        await apiService.updateEmployee(employeeData as UpdateEmployeeDto);
        toast.success('Employé modifié avec succès');
      } else {
        await apiService.createEmployee(employeeData as CreateEmployeeDto);
        toast.success('Employé créé avec succès');
      }
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'HTG') {
      return `${amount.toLocaleString()} HTG`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.Active:
        return 'bg-green-100 text-green-800';
      case EmployeeStatus.Inactive:
        return 'bg-gray-100 text-gray-800';
      case EmployeeStatus.Suspended:
        return 'bg-yellow-100 text-yellow-800';
      case EmployeeStatus.Terminated:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.Active:
        return <CheckCircle className="w-4 h-4" />;
      case EmployeeStatus.Inactive:
      case EmployeeStatus.Suspended:
      case EmployeeStatus.Terminated:
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 mr-3 text-primary-600" />
            Gestion des Employés
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez les employés de votre organisation
          </p>
        </div>
        <button
          onClick={handleCreateEmployee}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nouvel Employé
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Tous les statuts</option>
            <option value={EmployeeStatus.Active}>Actif</option>
            <option value={EmployeeStatus.Inactive}>Inactif</option>
            <option value={EmployeeStatus.Suspended}>Suspendu</option>
            <option value={EmployeeStatus.Terminated}>Licencié</option>
          </select>

          {/* Function Filter */}
          <select
            value={functionFilter}
            onChange={(e) => setFunctionFilter(e.target.value as EmployeeFunction | '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Toutes les fonctions</option>
            <option value={EmployeeFunction.Cashier}>Caissier</option>
            <option value={EmployeeFunction.CreditAgent}>Agent de Crédit</option>
            <option value={EmployeeFunction.BranchSupervisor}>Superviseur</option>
            <option value={EmployeeFunction.RegionalManager}>Manager Régional</option>
            <option value={EmployeeFunction.SystemAdmin}>Admin Système</option>
            <option value={EmployeeFunction.Accounting}>Comptabilité</option>
            <option value={EmployeeFunction.Management}>Direction</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setFunctionFilter('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            Aucun employé trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fonction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Succursale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {employee.firstName[0]}{employee.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {employee.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {employee.phoneNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatEmployeeFunction(employee.function)}
                      </div>
                      <div className="text-sm text-gray-500">
                        #{employee.employeeNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {employee.branchName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {formatCurrency(employee.baseSalary, employee.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                        {getStatusIcon(employee.status)}
                        <span className="ml-1">{formatEmployeeStatus(employee.status)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedEmployee(employee)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditEmployee(employee)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <EmployeeForm
          employee={editingEmployee}
          branchId={branchId}
          onSubmit={handleEmployeeSubmit}
          onCancel={() => {
            setShowEmployeeForm(false);
            setEditingEmployee(null);
          }}
        />
      )}

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Détails de l'employé
                </h3>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Numéro d'employé</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEmployee.employeeNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEmployee.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEmployee.phoneNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date d'embauche</label>
                  <p className="text-sm text-gray-900 mt-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(selectedEmployee.hireDate).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fonction</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatEmployeeFunction(selectedEmployee.function)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Succursale</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEmployee.branchName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Salaire de base</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {formatCurrency(selectedEmployee.baseSalary, selectedEmployee.currency)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Adresse</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEmployee.address}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact d'urgence</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedEmployee.emergencyContactName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedEmployee.emergencyContactPhone}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedEmployee.status)}`}>
                    {getStatusIcon(selectedEmployee.status)}
                    <span className="ml-1">{formatEmployeeStatus(selectedEmployee.status)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;