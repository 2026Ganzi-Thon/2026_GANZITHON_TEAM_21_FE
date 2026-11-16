import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/api/tokens';

// 백엔드 주소: .env 의 EXPO_PUBLIC_API_URL (예: http://192.168.0.10:8080)
// 비워두면 목업 모드 → 서버 없이 지금처럼 가짜 데이터로 동작 (부스 시연용 안전장치)
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export const USE_MOCK = !API_URL;

// API 명세 0.1 §1: 기본 경로 /api/v1, JSON, camelCase, Authorization: Bearer
// eslint-disable-next-line import/no-named-as-default-member
export const http = axios.create({
  baseURL: `${API_URL ?? ''}/api/v1`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청마다 저장된 토큰을 붙임
http.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── 오류 ──────────────────────────────────────────────
// 명세 §6: { error: { code, message, field?, retryAt? } }
export class ApiError extends Error {
  status: number;
  code: string;
  field?: string;
  retryAt?: string;
  constructor(status: number, code: string, message: string, field?: string, retryAt?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.retryAt = retryAt;
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof AxiosError) {
    const body = e.response?.data as
      { error?: { code?: string; message?: string; field?: string; retryAt?: string } } | undefined;
    const err = body?.error;
    if (e.response) {
      return new ApiError(
        e.response.status,
        err?.code ?? 'UNKNOWN',
        err?.message ?? '요청을 처리하지 못했어요.',
        err?.field,
        err?.retryAt,
      );
    }
    return new ApiError(0, 'NETWORK', '서버에 연결할 수 없어요. 인터넷 연결을 확인해주세요.');
  }
  return new ApiError(0, 'UNKNOWN', '알 수 없는 오류가 발생했어요.');
}

// ── 401 → 세션 갱신 한 번 시도 → 실패하면 로그아웃 (명세 §1) ──
let refreshing: Promise<boolean> | null = null;
let onSessionExpired: () => void = () => {};
export const setOnSessionExpired = (fn: () => void) => {
  onSessionExpired = fn;
};

async function refreshSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    // 갱신 요청은 인터셉터를 타지 않게 axios 기본 인스턴스로
    const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
    await saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      refreshing ??= refreshSession().finally(() => {
        refreshing = null;
      });
      if (await refreshing) return http(config);
      await clearTokens();
      onSessionExpired();
    }
    if (__DEV__) {
      console.warn(
        '[API]',
        error.response?.status,
        config?.method,
        config?.url,
        error.response?.data,
      );
    }
    return Promise.reject(toApiError(error));
  },
);

// ── 재시도 키 (명세 §1 ★ 요청) ──────────────────────────
// 사용자가 새로 누를 때마다 새 키, 같은 작업을 재전송할 때만 같은 키
export function newIdempotencyKey() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
export const idem = (key = newIdempotencyKey()) => ({ headers: { 'Idempotency-Key': key } });
