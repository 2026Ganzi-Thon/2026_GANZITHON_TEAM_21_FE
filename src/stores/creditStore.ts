import { useSyncExternalStore } from 'react';

// 음악 생성 크레딧 (남은 횟수)
// TODO: 연동 시 서버 값으로 교체 (GET 내 크레딧 / 결제 성공 시 갱신)
let credits = 3;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function addCredits(n: number) {
  credits += n;
  emit();
}

// 1회 사용. 크레딧이 없으면 false
export function spendCredit() {
  if (credits <= 0) return false;
  credits -= 1;
  emit();
  return true;
}

export function useCredits() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => credits,
  );
}
