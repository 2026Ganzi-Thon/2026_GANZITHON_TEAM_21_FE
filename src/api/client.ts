import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import {
  clearTokens,
  getAccessExpiresAt,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '@/api/tokens';

// 백엔드 주소: .env 의 EXPO_PUBLIC_API_URL
// 예) http://192.168.0.10:8080 또는 http://192.168.0.10:8080/api/v1 (둘 다 됨)
// 비워두면 목업 모드 → 서버 없이 지금처럼 가짜 데이터로 동작 (부스 시연용 안전장치)
// 앱 안 숨은 메뉴(설정 '도움과 소리' 제목 길게 누르기)에서 재빌드 없이 바꿀 수 있음
const normalize = (url?: string | null) =>
  url
    ?.trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '') || undefined;
const ENV_URL = normalize(process.env.EXPO_PUBLIC_API_URL);
const SERVER_KEY = 'serverUrlOverride'; // '' = 목업 강제, 없음 = .env 기본값

export let API_URL = ENV_URL;
export let USE_MOCK = !API_URL;

// 서버가 주는 '/api/v1/...' 경로를 전체 주소로 (음원 재생 주소 등)
export const absoluteUrl = (path: string) =>
  /^https?:\/\//.test(path) ? path : `${API_URL ?? ''}${path.startsWith('/') ? '' : '/'}${path}`;

// API 명세 v0.3 §1: 기본 경로 /api/v1, JSON, camelCase, Authorization: Bearer
// eslint-disable-next-line import/no-named-as-default-member
export const http = axios.create({
  baseURL: `${API_URL ?? ''}/api/v1`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

function applyServerUrl(url: string | undefined) {
  API_URL = url;
  USE_MOCK = !url;
  http.defaults.baseURL = `${url ?? ''}/api/v1`;
}

// 앱 켤 때 한 번: 숨은 메뉴에서 바꾼 주소가 있으면 적용
export async function loadServerUrl() {
  const saved = await AsyncStorage.getItem(SERVER_KEY).catch(() => null);
  if (saved !== null) applyServerUrl(normalize(saved));
}

// 숨은 메뉴: 서버 주소 바꾸기. null = .env 기본값, '' = 목업
// 다른 서버의 토큰은 못 쓰니까 바꾸면 로그아웃됨 (호출하는 쪽에서 signOut)
export async function setServerUrl(url: string | null) {
  if (url === null) {
    await AsyncStorage.removeItem(SERVER_KEY);
    applyServerUrl(ENV_URL);
  } else {
    await AsyncStorage.setItem(SERVER_KEY, url.trim());
    applyServerUrl(normalize(url));
  }
}
export const defaultServerUrl = () => ENV_URL;

// 요청마다 저장된 토큰을 붙임
http.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  // 직접 넣은 토큰이 있으면 그대로 (가입 직후 생년월일 저장)
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
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
    await saveTokens(data.accessToken, data.refreshToken, data.expiresIn);
    return true;
  } catch {
    return false;
  }
}

// 갱신은 동시에 한 번만 (여러 요청이 401을 받아도 refresh 1회)
const refreshOnce = () =>
  (refreshing ??= refreshSession().finally(() => {
    refreshing = null;
  }));

// 음원 재생은 axios 를 안 거쳐서 401 자동 갱신이 안 됨 → 재생 직전에 직접 확인
// 만료 30초 전이면 미리 갱신하고 쓸 수 있는 access 토큰을 돌려줌
export async function freshAccessToken(): Promise<string | null> {
  const expiresAt = await getAccessExpiresAt();
  if (expiresAt && expiresAt - Date.now() < 30000) await refreshOnce();
  return getAccessToken();
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      // 원래 요청을 그대로 다시 보냄 (Idempotency-Key 도 같은 키 유지)
      if (await refreshOnce()) return http(config);
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
