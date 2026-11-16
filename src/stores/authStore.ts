import { useSyncExternalStore } from 'react';

import { clearTokens, getAccessToken, saveTokens } from '@/api/tokens';

// 로그인 상태 (토큰이 있으면 로그인된 것으로 봄)
// loading = 앱 시작 직후 저장된 토큰 읽는 중
type Status = 'loading' | 'in' | 'out';

let status: Status = 'loading';
const listeners = new Set<() => void>();
const emit = (next: Status) => {
  status = next;
  listeners.forEach((l) => l());
};

getAccessToken()
  .then((token) => emit(token ? 'in' : 'out'))
  .catch(() => emit('out'));

export async function signIn(accessToken: string, refreshToken?: string | null) {
  await saveTokens(accessToken, refreshToken);
  emit('in');
}

export async function signOut() {
  await clearTokens();
  emit('out');
}

export function useAuthStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}
