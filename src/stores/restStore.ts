import { useSyncExternalStore } from 'react';

// 휴식 모드 (PRD 5-3)
// - now: 지금 쉬기 (직접 끌 때까지)
// - scheduled: 기간 예약 (from ~ to, 날짜 단위)
// 쉬는 동안 푸시 알림만 멈추고, 받은 구슬은 수신함에 그대로 보관. 발신자에게는 알리지 않음
// TODO: 연동 시 서버에 저장 (서버가 푸시를 보내지 않도록)
export type RestState =
  { mode: 'off' } | { mode: 'now' } | { mode: 'scheduled'; from: string; to: string }; // 'YYYY-MM-DD'

let state: RestState = { mode: 'off' };
const listeners = new Set<() => void>();
const set = (next: RestState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const restNow = () => set({ mode: 'now' });
export const scheduleRest = (from: string, to: string) => set({ mode: 'scheduled', from, to });
export const endRest = () => set({ mode: 'off' });

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 지금 쉬는 중인지
export function isResting(s: RestState = state, today = toDateKey(new Date())) {
  if (s.mode === 'now') return true;
  if (s.mode === 'scheduled') return s.from <= today && today <= s.to;
  return false;
}

export function useRest() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

const DAY = ['일', '월', '화', '수', '목', '금', '토'];

// '2026-11-15' → '11월 15일 (일)'
export const dateLabel = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${DAY[date.getDay()]})`;
};
