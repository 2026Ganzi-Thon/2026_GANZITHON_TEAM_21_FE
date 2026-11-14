import { useSyncExternalStore } from 'react';

import { mockInbox } from '@/mocks/receive';

// 수신함 열람 상태 (PRD 필수 9번 '감정구슬 수신함')
// TODO: 연동 시 수신함 API + 열람 처리 API (열람하면 보낸 사람은 보내기 취소 불가)
let opened = new Set(mockInbox.filter((r) => r.opened).map((r) => r.id));
const listeners = new Set<() => void>();

export const isOpened = (id: string) => opened.has(id);

export function markOpened(id: string) {
  if (opened.has(id)) return;
  opened = new Set(opened).add(id);
  listeners.forEach((l) => l());
}

export function useOpenedIds() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => opened,
  );
}
