import { EMOTIONS } from '@/constants/emotions';
import type { EmotionKey } from '@/types/emotion';

// 케어 넛지 (PRD 6장)
// 사용자가 직접 고른 구슬의 감정 단어만 보고 집계. AI 추론·진단 없음
export const CARE_TAGS = [
  '불안',
  '무기력',
  '외로움',
  '슬픔',
  '두려움',
  '막막함',
  '지침',
  '압박감',
  '소진',
];

// 케어 태그 단어가 들어 있는 구슬인지 (지금 매핑에서는 보라·파랑)
export const isCareEmotion = (key: EmotionKey) =>
  EMOTIONS.find((e) => e.key === key)?.words.some((w) => CARE_TAGS.includes(w)) ?? false;

export type CareStage = 0 | 1 | 2;

// days[i] = i일 전에 내가 기록한 감정들 (0 = 오늘). 하루에 여러 번이어도 1일로 셈
export function getCareStage(days: EmotionKey[][]): CareStage {
  const hit = (n: number) => days.slice(0, n).filter((ks) => ks.some(isCareEmotion)).length;
  if (hit(14) >= 10) return 2; // 2단계: 전문 지원 정보 강조
  if (hit(7) >= 4) return 1; // 1단계: 자기돌봄 안내
  return 0;
}
