// 가짜 데이터 - 백엔드 연동 시 내 정보 API(GET /me 등)로 교체
import type { EmotionKey } from '@/types/emotion';

export const mockMe = {
  id: 'random',
  name: '서현',
  emotion: 'orange' as EmotionKey, // 프로필 구슬 = 이번 주 내 대표 감정
  // QR 에 담을 친구추가 링크 (딥링크 형식은 백엔드와 정하기)
  friendLink: 'ganzithon21://friend/random',
};
