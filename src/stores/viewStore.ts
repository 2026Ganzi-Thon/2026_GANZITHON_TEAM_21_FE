import { useSyncExternalStore } from 'react';

// 지금 보고 있는 화면(내 감정 / 전체 감정) - 메인과 기록 탭이 같이 씀
// 라이브러리 없이 만든 아주 작은 전역 상태
let current = 1; // 0 = 내 감정, 1 = 전체 감정 (기본 화면)
const listeners = new Set<() => void>();

export function setViewIndex(index: number) {
  current = index;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useViewIndex() {
  return useSyncExternalStore(subscribe, () => current);
}
