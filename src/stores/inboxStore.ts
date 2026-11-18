import { useSyncExternalStore } from 'react';

import { mockInbox } from '@/mocks/receive';

// 수신함 열람 상태 (PRD 필수 9번 '감정구슬 수신함')
// 열람 처리는 서버(POST /receipts/{id}/open), 여기는 화면에 바로 반영하려는 용도
let opened = new Set(mockInbox.filter((r) => r.opened).map((r) => r.id));
// 서버가 알려준 안 연 구슬 (15초마다 GET /inbox?unreadOnly=true) → 반응 탭 숫자
let unread = new Set(mockInbox.filter((r) => !r.opened).map((r) => r.id));
let unreadCount = unread.size;
const listeners = new Set<() => void>();
const emit = () => {
  unreadCount = [...unread].filter((id) => !opened.has(id)).length;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const isOpened = (id: string) => opened.has(id);

export function markOpened(id: string) {
  if (opened.has(id)) return;
  opened = new Set(opened).add(id);
  emit();
}

export function setUnreadIds(ids: string[]) {
  unread = new Set(ids);
  emit();
}

export function useOpenedIds() {
  return useSyncExternalStore(subscribe, () => opened);
}

// 반응 탭에 띄울 새 구슬 개수 (안 연 것 - 이 앱에서 방금 연 것)
export function useUnreadCount() {
  return useSyncExternalStore(subscribe, () => unreadCount);
}
