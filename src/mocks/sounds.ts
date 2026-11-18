// 샘플 음악 목록 (목업). 연동 시 GET /catalog/sounds
// 기획 결정(11/16): 15초 이내 무보컬, 부스 시연은 미리 만든 샘플 음악
import { SampleSounds } from '@/constants/assets';
import type { AudioSource, EmotionKey } from '@/types/emotion';

export type SoundItem = {
  id: string;
  title: string;
  color: EmotionKey | null; // 어울리는 감정 색 (추천 순서에 씀)
  seconds: number;
  source: AudioSource;
};

export const mockSounds: SoundItem[] = [
  {
    id: 'sample_yellow',
    title: '햇살 산책',
    color: 'yellow',
    seconds: 15,
    source: SampleSounds.yellow,
  },
  {
    id: 'sample_orange',
    title: '설레는 걸음',
    color: 'orange',
    seconds: 15,
    source: SampleSounds.orange,
  },
  {
    id: 'sample_pink',
    title: '포근한 오후',
    color: 'pink',
    seconds: 15,
    source: SampleSounds.pink,
  },
  { id: 'sample_red', title: '가라앉히는 숨', color: 'red', seconds: 15, source: SampleSounds.red },
  {
    id: 'sample_purple',
    title: '창밖의 빗소리',
    color: 'purple',
    seconds: 15,
    source: SampleSounds.purple,
  },
  {
    id: 'sample_blue',
    title: '잔잔한 파도',
    color: 'blue',
    seconds: 15,
    source: SampleSounds.blue,
  },
  {
    id: 'sample_green',
    title: '숲속 시냇물',
    color: 'green',
    seconds: 15,
    source: SampleSounds.green,
  },
];
