// 가짜 알림 - 시연용. 연동 시 서버 푸시로 교체
import { mockLatestReceived } from '@/mocks/receive';
import { showNotification } from '@/stores/notificationStore';

// 친구가 나에게 감정을 보냄 → 누르면 받은 감정 화면
export const notifyReceived = () =>
  showNotification({
    title: '감정을 받았어요',
    body: `${mockLatestReceived.senderName}님이 감정을 보냈어요.`,
    hint: '앱을 열거나 위젯에서 반응해보세요.',
    emotion: mockLatestReceived.emotion,
    href: '/reaction',
  });

// 친구가 내 감정에 반응함 → 누르면 기록
export const notifyReacted = () =>
  showNotification({
    title: '친구가 반응했어요',
    body: '서현님이 내 감정에 반응했어요.',
    hint: '앱을 열어 확인해보세요.',
    emoji: '😆',
    href: '/record',
  });
