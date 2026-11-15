// 가짜 데이터 - 연동 시 GET /catalog/sounds 로 교체
// PRD v1.4 4-5, 5-2: 서비스가 제공하는 15초 이내 무보컬 소리 중에서 골라 구슬에 넣음 (AI 생성·크레딧 없음)
import { Sounds } from '@/constants/assets';

export type SoundItem = {
  id: string;
  title: string;
  seconds: number;
  source: number;
};

export const mockSounds: SoundItem[] = [
  { id: 's_warm', title: '포근한 오후', seconds: 12, source: Sounds.warm01 },
  { id: 's_clear', title: '맑은 새벽', seconds: 12, source: Sounds.clear01 },
  { id: 's_wave', title: '잔잔한 물결', seconds: 12, source: Sounds.wave01 },
  { id: 's_spark', title: '반짝이는 밤', seconds: 12, source: Sounds.spark01 },
];
