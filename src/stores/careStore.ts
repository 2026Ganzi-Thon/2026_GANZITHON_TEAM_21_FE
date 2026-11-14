import { useSyncExternalStore } from 'react';

// 마음 돋보기 안내 (설정에서 끌 수 있음) + 홈 카드 닫기 (앱 켜져 있는 동안)
// TODO: 연동 시 설정 값은 서버에 저장
let state = { enabled: true, dismissed: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<typeof state>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const setCareEnabled = (enabled: boolean) => set({ enabled });
export const dismissCareCard = () => set({ dismissed: true });

export function useCare() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
