import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { X, Save, Calendar, Mail, Phone, MapPin, DollarSign } from 'lucide-react';
import { 
  Employee, 
  CreateEmployeeDto, 
  UpdateEmployeeDto,
  EmployeeFunction,
  EmployeeStatus,
  formatEmployeeFunction 
} from '../../types/payroll';
import { Branch } from '../../types/branch';
import apiService from '../../services/apiService';

interface EmployeeFormProps {
  employee?: Employee | null;
  branchId?: string;
  onSubmit: (data: CreateEmployeeDto | UpdateEmployeeDto) => void;
  onCancel: () => void;
}

const employeeSchema = yup.object({
  employeeNumber: yup.string().required('Numéro d\'employé requis'),
  firstName: yup.string().required('Prénom requis'),
  lastName: yup.string().required('Nom de famille requis'),
  email: yup.string().email('Email invalide').required('Email requis'),
  phoneNumber: yup.string().required('Numéro de téléphone requis'),
  nationalId: yup.string().required('Numéro d\'identité nationale requis'),
  dateOfBirth: yup.string().required('Date de naissance requise'),
  hireDate: yup.string().required('Date d\'embauche requise'),
  function: yup.number().required('Fonction requise'),
  branchId: yup.string().required('Succursale requise'),
  baseSalary: yup.number().min(0, 'Salaire invalide').required('Salaire de base requis'),
  currency: yup.string().oneOf(['HTG', 'USD'], 'Devise invalide').required('Devise requise'),
  bankAccountNumber: yup.string(),
  bankName: yup.string(),
  address: yup.string().required('Adresse requise'),
  emergencyContactName: yup.string().required('Contact d\'urgence requis'),
  emergencyContactPhone: yup.string().required('Téléphone du contact d\'urgence requis'),
  status: yup.number().when('$isEdit', {
    is: true,
    then: (schema) => schema.required('Statut requis'),
    otherwise: (schema) => schema.notRequired()
  }),
  terminationDate: yup.string().nullable()
});

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, branchId, onSubmit, onCancel }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const isEdit = !!employee;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: yupResolver(employeeSchema),
    context: { isEdit },
    defaultValues: {
      employeeNumber: employee?.employeeNumber || '',
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      email: employee?.email || '',
      phoneNumber: employee?.phoneNumber || '',
      nationalId: employee?.nationalId || '',
      dateOfBirth: employee?.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      hireDate: employee?.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      function: employee?.function ?? EmployeeFunction.Cashier,
      branchId: employee?.branchId || branchId || '',
      baseSalary: employee?.baseSalary || 0,
      currency: employee?.currency || 'HTG',
      bankAccountNumber: employee?.bankAccountNumber || '',
      bankName: employee?.bankName || '',
      address: employee?.address || '',
      emergencyContactName: employee?.emergencyContactName || '',
      emergencyContactPhone: employee?.emergencyContactPhone || '',
      status: employee?.status ?? EmployeeStatus.Active,
      terminationDate: employee?.terminationDate ? new Date(employee.terminationDate).toISOString().split('T')[0] : ''
    }
  });

  const watchedStatus = watch('status');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await apiService.getAllBranches();
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const onFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const formData = {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth).toISOString(),
        hireDate: new Date(data.hireDate).toISOString(),
        terminationDate: data.terminationDate ? new Date(data.terminationDate).toISOString() : null,
        ...(isEdit && { id: employee!.id })
      };

      onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <form onSubmit={handleSubmit(onFormSubmit)}>
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? 'Modifier l\'employé' : 'Nouvel employé'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations personnelles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro d'employé *
                  </label>
                  <input
                    type="text"
                    {...register('employeeNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="EMP001"
                  />
                  {errors.employeeNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.employeeNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro d'identité nationale *
                  </label>
                  <input
                    type="text"
                    {...register('nationalId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="123-456-789-0"
                  />
                  {errors.nationalId && (
                    <p className="text-red-500 text-sm mt-1">{errors.nationalId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    {...register('firstName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Jean"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    {...register('lastName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Dupont"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    {...register('dateOfBirth')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Date d'embauche *
                  </label>
                  <input
                    type="date"
                    {...register('hireDate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.hireDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.hireDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="jean.dupont@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    {...register('phoneNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="+509 1234 5678"
                  />
                  {errors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Adresse *
                  </label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="123 Rue de la Paix, Port-au-Prince, Haïti"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact d'urgence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du contact d'urgence *
                  </label>
                  <input
                    type="text"
                    {...register('emergencyContactName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Marie Dupont"
                  />
                  {errors.emergencyContactName && (
                    <p className="text-red-500 text-sm mt-1">{errors.emergencyContactName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone du contact d'urgence *
                  </label>
                  <input
                    type="tel"
                    {...register('emergencyContactPhone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="+509 8765 4321"
                  />
                  {errors.emergencyContactPhone && (
                    <p className="text-red-500 text-sm mt-1">{errors.emergencyContactPhone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations d'emploi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fonction *
                  </label>
                  <select
                    {...register('function')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={EmployeeFunction.Cashier}>{formatEmployeeFunction(EmployeeFunction.Cashier)}</option>
                    <option value={EmployeeFunction.CreditAgent}>{formatEmployeeFunction(EmployeeFunction.CreditAgent)}</option>
                    <option value={EmployeeFunction.BranchSupervisor}>{formatEmployeeFunction(EmployeeFunction.BranchSupervisor)}</option>
                    <option value={EmployeeFunction.RegionalManager}>{formatEmployeeFunction(EmployeeFunction.RegionalManager)}</option>
                    <option value={EmployeeFunction.SystemAdmin}>{formatEmployeeFunction(EmployeeFunction.SystemAdmin)}</option>
                    <option value={EmployeeFunction.Accounting}>{formatEmployeeFunction(EmployeeFunction.Accounting)}</option>
                    <option value={EmployeeFunction.Management}>{formatEmployeeFunction(EmployeeFunction.Management)}</option>
                    <option value={EmployeeFunction.Security}>{formatEmployeeFunction(EmployeeFunction.Security)}</option>
                    <option value={EmployeeFunction.Maintenance}>{formatEmployeeFunction(EmployeeFunction.Maintenance)}</option>
                    <option value={EmployeeFunction.CustomerService}>{formatEmployeeFunction(EmployeeFunction.CustomerService)}</option>
                  </select>
                  {errors.function && (
                    <p className="text-red-500 text-sm mt-1">{errors.function.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Succursale *
                  </label>
                  <select
                    {...register('branchId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Sélectionner une succursale</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {errors.branchId && (
                    <p className="text-red-500 text-sm mt-1">{errors.branchId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Salaire de base *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('baseSalary')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="50000"
                  />
                  {errors.baseSalary && (
                    <p className="text-red-500 text-sm mt-1">{errors.baseSalary.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise *
                  </label>
                  <select
                    {...register('currency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="HTG">HTG - Gourde Haïtienne</option>
                    <option value="USD">USD - Dollar Américain</option>
                  </select>
                  {errors.currency && (
                    <p className="text-red-500 text-sm mt-1">{errors.currency.message}</p>
                  )}
                </div>

                {isEdit && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut *
                      </label>
                      <select
                        {...register('status')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value={EmployeeStatus.Active}>Actif</option>
                        <option value={EmployeeStatus.Inactive}>Inactif</option>
                        <option value={EmployeeStatus.Suspended}>Suspendu</option>
                        <option value={EmployeeStatus.Terminated}>Licencié</option>
                      </select>
                      {errors.status && (
                        <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                      )}
                    </div>

                    {watchedStatus === EmployeeStatus.Terminated && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de licenciement
                        </label>
                        <input
                          type="date"
                          {...register('terminationDate')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        />
                        {errors.terminationDate && (
                          <p className="text-red-500 text-sm mt-1">{errors.terminationDate.message}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Banking Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations bancaires (optionnel)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la banque
                  </label>
                  <input
                    type="text"
                    {...register('bankName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Banque de la République d'Haïti"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de compte
                  </label>
                  <input
                    type="text"
                    {...register('bankAccountNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;