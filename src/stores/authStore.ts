import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { TOKEN_KEY } from '@/api/client';

// 로그인 상태 (토큰이 있으면 로그인된 것으로 봄)
// loading = 앱 시작 직후 저장된 토큰 읽는 중
type Status = 'loading' | 'in' | 'out';

let status: Status = 'loading';
const listeners = new Set<() => void>();
const emit = (next: Status) => {
  status = next;
  listeners.forEach((l) => l());
};

AsyncStorage.getItem(TOKEN_KEY)
  .then((token) => emit(token ? 'in' : 'out'))
  .catch(() => emit('out'));

export async function signIn(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  emit('in');
}

export async function signOut() {
  await AsyncStorage.removeItem(TOKEN_KEY);
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
