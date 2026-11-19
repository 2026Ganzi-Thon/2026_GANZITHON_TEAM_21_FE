// 가짜 데이터 - 최근 14일 동안 내가 고른 감정 (0 = 오늘). 연동 시 감정 기록 API로 교체
import type { EmotionKey } from '@/types/emotion';

// 시연용: 최근 7일 중 4일 보라·파랑 → 1단계 안내가 뜸
export const mockMyDays: EmotionKey[][] = [
  ['blue'],
  ['purple', 'yellow'],
  [],
  ['blue'],
  ['green'],
  ['purple'],
  ['orange'],
  [],
  ['yellow'],
  ['blue'],
  [],
  ['green'],
  [],
  ['pink'],
];
