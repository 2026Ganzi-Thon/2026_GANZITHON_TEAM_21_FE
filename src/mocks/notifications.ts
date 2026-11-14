// 가짜 알림 - 시연용. 연동 시 서버 푸시로 교체
import { mockLatestReceived } from '@/mocks/receive';
import { showNotification } from '@/stores/notificationStore';

// PRD 7장: 알림에는 감정 색·단어·음악을 보여주지 않음 → '새 구슬 도착'만 안내

// 새 감정구슬 도착 → 누르면 받은 구슬 화면
export const notifyReceived = () =>
  showNotification({
    title: '감정을 받았어요',
    body: '새로운 감정구슬이 도착했어요.',
    hint: '앱을 열어 확인해보세요.',
    href: { pathname: '/reaction', params: { id: mockLatestReceived.id } },
  });

// 익명으로 보낸 내 구슬에 반응이 옴 (친구 사이에는 반응 기능 없음) → 누르면 기록
export const notifyReacted = () =>
  showNotification({
    title: '반응이 도착했어요',
    body: '익명의 사용자가 내 감정에 반응했어요.',
    hint: '앱을 열어 확인해보세요.',
    emoji: '🫂',
    href: '/record',
  });
