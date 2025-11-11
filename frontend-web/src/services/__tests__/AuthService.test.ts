/// <reference types="@types/jest" />

import type { UserInfo } from '../auth/AuthService';
import { authService } from '../auth/AuthService';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear localStorage and sessionStorage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('utility methods', () => {
    it('isAuthenticated should return true when token exists', () => {
      localStorage.setItem('token', 'some-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated should return false when token is missing', () => {
      localStorage.removeItem('token');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('getCurrentUser should parse stored user', () => {
      const user: UserInfo = {
        id: '111',
        email: 'stored@example.com',
        firstName: 'Stored',
        lastName: 'User',
        role: 'Admin',
      };
      sessionStorage.setItem('user', JSON.stringify(user));

      const result = authService.getCurrentUser();
      expect(result).toEqual(user);
    });

    it('getCurrentUser should return null when no user stored', () => {
      sessionStorage.removeItem('user');
      const result = authService.getCurrentUser();
      expect(result).toBeNull();
    });

    it('setCurrentUser should store user in sessionStorage', () => {
      const user: UserInfo = {
        id: '222',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'User',
      };

      authService.setCurrentUser(user);

      const stored = sessionStorage.getItem('user');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(user);
    });

    it('getAuthToken should retrieve token from localStorage', () => {
      localStorage.setItem('token', 'test-token-123');
      expect(authService.getAuthToken()).toBe('test-token-123');
    });

    it('getAuthToken should return null when no token', () => {
      localStorage.removeItem('token');
      expect(authService.getAuthToken()).toBeNull();
    });
  });
});
