import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import apiService from '../../services/apiService';
import { loginSchema } from '../../validation/schemas';
import { UserInfo } from '../../services';

interface LoginProps {
  onLogin: (user: UserInfo, token: string) => void;
}

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: async (data, context, options) => {
      try {
        // Use safeParse to avoid throwing
        const result = loginSchema.safeParse(data);
        if (!result.success) {
          // Transform Zod errors to react-hook-form format
          const fieldErrors: Record<string, any> = {};
          result.error.issues.forEach((err: any) => {
            const path = err.path[0] as string;
            // Only keep first error per field
            if (!fieldErrors[path]) {
              fieldErrors[path] = {
                type: err.code,
                message: err.message,
              };
            }
          });
          return {
            values: {},
            errors: fieldErrors,
          };
        }
        return {
          values: result.data,
          errors: {},
        };
      } catch (error) {
        console.error('Form validation error:', error);
        return {
          values: {},
          errors: {},
        };
      }
    },
    mode: 'onSubmit',
    criteriaMode: 'firstError',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Make actual API call to backend for authentication
      const response = await apiService.login({
        email: data.email,
        password: data.password,
      });

      console.log('Login response:', response);
      console.log('User data:', response.user);
      console.log('User role:', response.user?.role);

      if (response && response.token && response.user) {
        // Check if user has a web dashboard role
        const webOnlyRoles = ['Cashier', 'Secretary', 'AdministrativeSecretary', 'CreditAgent'];
        if (webOnlyRoles.includes(response.user.role)) {
          toast.error('Votre rôle nécessite l\'application desktop. Veuillez utiliser l\'application desktop pour vous connecter.');
          return;
        }
        
        toast.success('Connexion réussie !');
        // Use the user data from login response
        onLogin(response.user, response.token);
      } else {
        toast.error('Email ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle invalid form (prevent raw ZodError overlay & show friendly message)
  const onInvalid = (formErrors: any) => {
    // Collect unique messages
    const messages = Object.values(formErrors)
      .map((err: any) => err?.message)
      .filter(Boolean);
    if (messages.length === 0) {
      toast.error('Veuillez renseigner votre email et votre mot de passe.');
    } else {
      // Combine but keep it short
      toast.error(messages.join(' | '));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Nala Kredi Ti Machann
          </h2>
          <p className="text-gray-600">
            Connectez-vous à votre compte
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          {/* Global form errors summary (optional) */}
          {Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {Object.values(errors).map((e, idx) => (
                <div key={idx}>{(e as any).message}</div>
              ))}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('email')}
                type="email"
                autoComplete="off"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200"
                placeholder="votre@email.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition duration-200"
                placeholder="••••••••"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Se souvenir de moi
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Mot de passe oublié ?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connexion en cours...
                </div>
              ) : (
                'Se connecter'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8">
          <p>© 2025 Nala Kredi Ti Machann. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;