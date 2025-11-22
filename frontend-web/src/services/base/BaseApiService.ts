import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

type CacheEntry<T = any> = { data: T; expiresAt: number };

// Classe de base pour tous les services API
export abstract class BaseApiService {
  protected api: AxiosInstance;
  // Simple in-memory GET cache (opt-in). Keyed by URL + serialized params.
  private static cache = new Map<string, CacheEntry>();
  private static buildKey(url: string, config?: AxiosRequestConfig): string {
    const params = config?.params ? JSON.stringify(config.params) : '';
    const headers = config?.headers && typeof config.headers === 'object' ? JSON.stringify(config.headers) : '';
    return `${url}|p:${params}|h:${headers}`;
  }

  /**
   * Invalider toutes les entrées de cache dont la clé commence par le préfixe donné.
   * Exemple: invalidateCacheByPrefix('/branch') invalide toutes les requêtes /branch*
   */
  public static invalidateCacheByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    BaseApiService.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => BaseApiService.cache.delete(key));
  }

  /**
   * Invalider complètement le cache (utile après des modifications globales).
   */
  public static clearCache(): void {
    BaseApiService.cache.clear();
  }

  constructor(baseURL?: string) {
    this.api = axios.create({
      baseURL: baseURL || process.env.REACT_APP_API_URL || 'https://localhost:5001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('🔧 BaseApiService initialized:', {
      baseURL: this.api.defaults.baseURL
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor pour ajouter le token d'authentification - USING getAuthToken() CONSISTENTLY
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        console.log('🔐 BaseApiService Interceptor - Token found:', !!token, 'for URL:', config.url);
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ BaseApiService Authorization header set for:', config.url);
        } else {
          console.warn('⚠️ BaseApiService No token found for request:', config.url);
        }
        return config;
      },
      (error) => {
        console.error('❌ BaseApiService Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor pour gérer les erreurs d'authentification - USING clearAuthToken() CONSISTENTLY
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ BaseApiService Response received:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('❌ BaseApiService Response error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        
        if (error.response?.status === 401) {
          console.warn('🚨 BaseApiService 401 Unauthorized - Clearing tokens');
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  // Debug methods
  public debugAuthState(): void {
    console.group('🔐 BaseApiService Authentication Debug');
    console.log('getAuthToken result:', !!this.getAuthToken());
    console.log('LocalStorage token:', localStorage.getItem('token'));
    console.log('BaseURL:', this.api.defaults.baseURL);
    console.groupEnd();
  }

  protected handleUnauthorized(): void {
    console.warn('🔒 BaseApiService Handling unauthorized access');
    this.clearAuthToken();
    
    // Anpeche redirect loop - only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirectUrl}`;
    }
  }

  protected getAuthToken(): string | null {
    // Tcheke plizyè kote kote token ka sere - SÈLMAN localStorage pou konsistans
    const token = 
      localStorage.getItem('token') ||
      localStorage.getItem('authToken');
    
    // When a token is present, decode its payload for debugging (role, expiry, etc.)
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          console.log('🔑 BaseApiService getAuthToken result: token present. Decoded payload:', decoded);
        } else {
          console.log('🔑 BaseApiService getAuthToken result: token present (non-JWT)');
        }
      } catch (err) {
        console.warn('⚠️ BaseApiService failed to decode token payload for debug:', err);
      }
    } else {
      console.log('🔑 BaseApiService getAuthToken result: no token');
    }

    return token;
  }

  protected setAuthToken(token: string): void {
    console.log('💾 BaseApiService Setting auth token');
    localStorage.setItem('token', token);
  }

  protected clearAuthToken(): void {
    console.log('🧹 BaseApiService Clearing all auth tokens');
    // Efase tout token ki ka egziste - SÈLMAN localStorage pou konsistans
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    console.log('🚀 BaseApiService Making request:', config.method?.toUpperCase(), config.url);
    try {
      const response: AxiosResponse<T> = await this.api.request(config);
      console.log('✅ BaseApiService Request successful:', response.status, config.url);
      return response.data;
    } catch (error) {
      console.error('❌ BaseApiService Request failed:', {
        url: config.url,
        method: config.method,
        error: error
      });
      throw error;
    }
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // Opt-in cache with TTL via headers or params
    const headers = (config?.headers || {}) as Record<string, any>;
    const noCache = headers['x-cache'] === 'bypass' || (config as any)?.params?.noCache === true;
    const ttlMs = Number(headers['x-cache-ttl'] ?? (config as any)?.params?.cacheTTL ?? 0);

    if (!noCache && ttlMs > 0) {
      const key = BaseApiService.buildKey(url, config);
      const now = Date.now();
      const cached = BaseApiService.cache.get(key) as CacheEntry<T> | undefined;
      if (cached && cached.expiresAt > now) {
        console.log('💾 BaseApiService Cache hit for:', url);
        return cached.data;
      }
      console.log('🔍 BaseApiService Cache miss for:', url);
      const data = await this.request<T>({ ...config, method: 'GET', url });
      BaseApiService.cache.set(key, { data, expiresAt: now + ttlMs });
      return data;
    }

    return this.request<T>({ ...config, method: 'GET', url });
  }

  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  protected async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}