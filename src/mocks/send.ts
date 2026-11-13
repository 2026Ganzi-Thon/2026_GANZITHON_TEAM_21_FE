// 가짜 데이터 - 백엔드 연동 시 친구/그룹 목록 API로 교체
import { Avatars } from '@/constants/assets';
import type { Recipient } from '@/types/emotion';

export const mockRecipients: Recipient[] = [
  { id: 'g1', name: '서현 외 3명', avatar: Avatars.a1 },
  { id: 'g2', name: '감정공유자들', avatar: Avatars.a2 },
  { id: 'u1', name: '상헌', avatar: Avatars.a1 },
  { id: 'u2', name: '오리', avatar: Avatars.a1 },
  { id: 'u3', name: '예은', avatar: Avatars.a1 },
];
