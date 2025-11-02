import { create } from 'zustand';
import { UserInfo } from '../services';
import apiService from '../services/apiService';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: UserInfo, token: string) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  setAuth: (user, token) => {
    apiService.setAuthToken(token);
    apiService.setCurrentUser(user);
    set({ user, token });
  },
  clearAuth: () => {
    try { apiService.removeAuthToken(); } catch {}
    set({ user: null, token: null });
  },
  hydrate: async () => {
    const token = apiService.getAuthToken();
    const storedUser = apiService.getCurrentUser();
    if (token && storedUser) {
      try {
        const currentUser = await apiService.getProfile();
        apiService.setCurrentUser(currentUser);
        set({ user: currentUser, token, loading: false });
        return;
      } catch {
        try { apiService.removeAuthToken(); } catch {}
      }
    }
    set({ user: null, token: null, loading: false });
  }
}));
