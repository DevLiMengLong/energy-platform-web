import type { ApiResponse } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly traceId?: string
  ) {
    super(message);
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => string | null
  ) {}

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    const url = `${this.baseUrl}${path}${query.size ? `?${query.toString()}` : ''}`;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const token = this.getToken();
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });
    const payload = (await response.json()) as ApiResponse<T>;
    if (!response.ok || payload.code !== 'SUCCESS') {
      throw new ApiError(payload.message || 'Request failed', payload.code || String(response.status), payload.traceId);
    }
    return payload.data;
  }
}

export function pickLabel(language: 'zh' | 'en', zh: string, en: string): string {
  return language === 'zh' ? zh : en;
}
