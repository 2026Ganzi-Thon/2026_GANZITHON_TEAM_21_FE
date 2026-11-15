import type { ImageSource } from 'expo-image';
import type { Href } from 'expo-router';
import { useSyncExternalStore } from 'react';

import { isResting } from '@/stores/restStore';

// 앱 안 알림 배너 (피그마 '알림')
// TODO: 연동 시 서버 푸시(expo-notifications) / 실시간 이벤트를 받아서 notify() 호출
export type InAppNotification = {
  id: string;
  title: string; // 감정을 받았어요
  body: string; // 서현님이 감정을 보냈어요.
  hint?: string; // 앱을 열거나 위젯에서 반응해보세요.
  // 오른쪽 미리보기 (둘 중 하나)
  // 앱 안 배너에서는 감정 구슬을 보여줌. 잠금화면 푸시(서버가 보냄)에는 구슬·색을 넣지 않음 (디자인 논의 11/15)
  orb?: ImageSource | number; // require() 로 불러온 이미지 = number
  emoji?: string; // 반응 이모지
  href?: Href; // 누르면 이동할 화면
};

let current: InAppNotification | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showNotification(n: Omit<InAppNotification, 'id'>) {
  if (isResting()) return; // 휴식 중엔 알림을 띄우지 않음 (구슬은 수신함에 보관)
  current = { ...n, id: String(Date.now()) };
  emit();
}

export function dismissNotification() {
  current = null;
  emit();
}

export function useCurrentNotification() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
