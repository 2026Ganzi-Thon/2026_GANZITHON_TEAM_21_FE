// 가짜 데이터 - 백엔드 연동 시 친구 목록 API로 교체 (친구끼리만 보낼 수 있음, 그룹은 후속 기능)
import { Avatars } from '@/constants/assets';
import type { Recipient } from '@/types/emotion';

export const mockRecipients: Recipient[] = [
  { id: 'u1', name: '상헌', avatar: Avatars.a1 },
  { id: 'u2', name: '오리', avatar: Avatars.a1 },
  { id: 'u3', name: '예은', avatar: Avatars.a1 },
];
