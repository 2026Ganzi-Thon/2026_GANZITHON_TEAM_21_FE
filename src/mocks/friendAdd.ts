// 가짜 데이터 - 백엔드 연동 시 친구 요청 목록 / 사용자 검색 API로 교체
import type { EmotionKey } from '@/types/emotion';

export type FriendRequest = { id: string; name: string; emotion: EmotionKey };

// 나에게 온 친구 요청
export const mockRequests: FriendRequest[] = [
  { id: 'r1', name: 'random2', emotion: 'purple' },
  { id: 'r2', name: 'random3', emotion: 'yellow' },
  { id: 'r3', name: 'random4', emotion: 'green' },
  { id: 'r4', name: 'random5', emotion: 'orange' },
  { id: 'r5', name: 'random6', emotion: 'pink' },
];

// 검색 결과 상태: none = 추가 가능, requested = 요청 보냄(흐리게), friend = 이미 친구(버튼 없음)
export type UserStatus = 'none' | 'requested' | 'friend';
export type SearchUser = { id: string; name: string; emotion: EmotionKey; status: UserStatus };

export const mockUsers: SearchUser[] = [
  { id: 'u1', name: 'random2', emotion: 'purple', status: 'none' },
  { id: 'u2', name: 'random3', emotion: 'yellow', status: 'none' },
  { id: 'u3', name: 'random4', emotion: 'green', status: 'friend' },
  { id: 'u4', name: 'random44', emotion: 'orange', status: 'requested' },
  { id: 'u5', name: 'random7', emotion: 'blue', status: 'none' },
  { id: 'u6', name: 'sunny', emotion: 'red', status: 'none' },
];
