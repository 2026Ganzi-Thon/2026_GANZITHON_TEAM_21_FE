// 가짜 데이터 - 백엔드 연동 시 친구 목록 API로 교체
import type { EmotionKey } from '@/types/emotion';

export type Friend = {
  id: string;
  name: string;
  emotion: EmotionKey; // 친구의 이번 주 대표 감정 구슬
  favorite: boolean; // ♡ 즐겨찾기
};

export const mockFriends: Friend[] = [
  { id: 'f1', name: 'random2', emotion: 'purple', favorite: false },
  { id: 'f2', name: 'random3', emotion: 'yellow', favorite: false },
  { id: 'f3', name: 'random4', emotion: 'green', favorite: false },
  { id: 'f4', name: 'random5', emotion: 'orange', favorite: false },
  { id: 'f5', name: 'random6', emotion: 'blue', favorite: false },
  { id: 'f6', name: 'random7', emotion: 'pink', favorite: false },
];
