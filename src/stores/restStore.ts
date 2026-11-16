import { useSyncExternalStore } from 'react';

import { settings } from '@/api/emori';
import type { Rest } from '@/api/types';
import { notify } from '@/utils/dialog';

// 휴식 모드 (PRD 5-3)
// - now: 지금 쉬기 (직접 끌 때까지)
// - scheduled: 기간 예약 (from ~ to, 날짜 단위)
// 쉬는 동안 푸시 알림만 멈추고, 받은 구슬은 수신함에 그대로 보관. 발신자에게는 알리지 않음
// 바꿀 때마다 서버에 저장 (서버가 쉬는 동안 푸시를 보내지 않도록, PUT /me/rest)
export type RestState =
  { mode: 'off' } | { mode: 'now' } | { mode: 'scheduled'; from: string; to: string }; // 'YYYY-MM-DD'

let state: RestState = { mode: 'off' };
const listeners = new Set<() => void>();
const emit = (next: RestState) => {
  state = next;
  listeners.forEach((l) => l());
};
const set = (next: RestState) => {
  const prev = state;
  emit(next);
  settings.rest(next).catch(() => {
    emit(prev); // 저장 실패하면 되돌림
    notify('잠시 쉬기를 저장하지 못했어요.', '잠시 후 다시 시도해주세요.');
  });
};

// 서버에 저장된 휴식 상태를 앱에 반영 (설정 화면 들어올 때). 서버 날짜는 한국 시간 기준
const kstDate = (iso: string, minusDay = false) => {
  const t = new Date(iso).getTime() + 9 * 3600000 - (minusDay ? 86400000 : 0);
  return new Date(t).toISOString().slice(0, 10);
};
export function hydrateRest(r: Rest) {
  if (r.mode === 'OFF') emit({ mode: 'off' });
  else if (r.mode === 'MANUAL') emit({ mode: 'now' });
  else if (r.startsAt && r.endsAt)
    emit({ mode: 'scheduled', from: kstDate(r.startsAt), to: kstDate(r.endsAt, true) });
}

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
