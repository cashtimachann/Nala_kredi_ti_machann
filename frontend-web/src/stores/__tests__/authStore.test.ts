import { useAuthStore } from '../../stores/authStore';

jest.mock('../../services/apiService', () => ({
  __esModule: true,
  default: {
    setAuthToken: jest.fn(),
    setCurrentUser: jest.fn(),
    removeAuthToken: jest.fn(),
    getAuthToken: jest.fn(() => null),
    getCurrentUser: jest.fn(() => null),
    getProfile: jest.fn(async () => ({ id: '1', fullName: 'John Doe', email: 'john@example.com' })),
  },
}));

describe('useAuthStore', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, token: null, loading: false });
  });

  test('setAuth sets user and token', () => {
    const user = { id: '1', fullName: 'John Doe', email: 'john@example.com' } as any;
    const token = 'tkn';
    useAuthStore.getState().setAuth(user, token);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.token).toEqual(token);
  });

  test('clearAuth clears user and token', () => {
    useAuthStore.setState({ user: { id: '1' } as any, token: 't', loading: false });
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  test('hydrate sets loading=false when no stored auth', async () => {
    useAuthStore.setState({ user: null, token: null, loading: true });
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().loading).toBe(false);
  });
});
