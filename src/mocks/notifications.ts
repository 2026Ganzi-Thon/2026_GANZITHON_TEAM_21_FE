// 가짜 알림 - 시연용. 연동 시 서버 푸시로 교체
import { orbSource } from '@/constants/emotions';
import { mockLatestReceived } from '@/mocks/receive';
import { showNotification } from '@/stores/notificationStore';
import type { ReceivedEmotion } from '@/types/emotion';

// 잠금화면 푸시: 감정 색·단어·음악 없이 '새 구슬 도착'만 (서버가 보냄, PRD 7장)
// 앱 안 배너: 받은 구슬 미리보기를 보여줌 (디자인 논의 11/15). 단어·음악은 계속 안 보여줌

// 새 감정구슬 도착 → 누르면 받은 구슬 화면
export const notifyReceived = () =>
  showNotification({
    title: '감정을 받았어요',
    body: '새로운 감정구슬이 도착했어요.',
    hint: '앱을 열어 확인해보세요.',
    orb: orbSource(mockLatestReceived.emotions),
    href: { pathname: '/received', params: { id: mockLatestReceived.id } },
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

// 서버 연동: 새로 받은 구슬 1개를 앱 안 배너로 (잠금화면 푸시는 서버가 따로 보냄)
export const notifyReceipt = (r: ReceivedEmotion) =>
  showNotification({
    title: '감정을 받았어요',
    body: '새로운 감정구슬이 도착했어요.',
    hint: '앱을 열어 확인해보세요.',
    orb: orbSource(r.emotions),
    href: { pathname: '/received', params: { id: r.id } },
  });
