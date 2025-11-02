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

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor pour ajouter le token d'authentification
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor pour gérer les erreurs d'authentification
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuthToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  protected getAuthToken(): string | null {
    return sessionStorage.getItem('auth_token');
  }

  protected setAuthToken(token: string): void {
    sessionStorage.setItem('auth_token', token);
  }

  protected clearAuthToken(): void {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user');
  }

  protected async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.request(config);
    return response.data;
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
        return cached.data;
      }
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