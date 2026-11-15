import { MixOrbs, Orbs } from '@/constants/assets';
import type { EmotionKey } from '@/types/emotion';

export const ORB_FILL = 0.85;
// 리스트(상세 기록·소셜·받은 감정) 구슬이 화면에 보이는 지름 (피그마 = 40)
export const LIST_ORB_VISIBLE = 40;

// 감정 휠의 7색 구슬 (휠 위 순서: 오른쪽 위 → 아래 → 왼쪽 위)
// label = 감정 영역, words = 사전 정의 감정 단어 (기능명세서 v1.2 / PRD v1.3 '감정구슬 매핑 기준')
// 사용자가 단어를 따로 고르지 않음 - 구슬을 고르면 자동 적용
// fill / centerY: 이미지 안에서 실제 구슬이 차지하는 비율과 세로 중심 위치
// 최종 에셋은 전부 85% · 정가운데로 맞춰 둠 (이미지를 바꾸면 이 값도 확인)
// - 구슬 이미지마다 투명 여백이 달라서, 이 값으로 보정해야 화면에서 크기가 똑같아 보임
// - 이미지를 바꾸면 다시 재야 함
export const EMOTIONS: {
  key: EmotionKey;
  label: string;
  words: string[];
  image: number;
  glow: string;
  fill: number;
  centerY: number;
}[] = [
  {
    key: 'green',
    label: '안정·회복',
    words: ['편안함', '안정', '회복 중', '평온'],
    image: Orbs.green,
    glow: '#2F6B5E',
    fill: ORB_FILL,
    centerY: 0.5,
  },
  {
    key: 'blue',
    label: '가라앉음',
    words: ['가라앉음', '외로움', '무기력', '지침'],
    image: Orbs.blue,
    glow: '#5F7CA8',
    fill: ORB_FILL,
    centerY: 0.5,
  },
  {
    key: 'purple',
    label: '복잡함·불안',
    words: ['불안', '막막함', '복잡함', '생각이 많음'],
    image: Orbs.purple,
    glow: '#5E4FA8',
    fill: ORB_FILL,
    centerY: 0.5,
  },
  {
    key: 'pink',
    label: '애정·다정함',
    words: ['애정', '다정함', '그리움', '위로받고 싶음'],
    image: Orbs.pink,
    glow: '#A85F8E',
    fill: ORB_FILL,
    centerY: 0.5,
  },
  {
    key: 'red',
    label: '강한 감정',
    words: ['짜증', '화남', '억울함', '벅참'],
    image: Orbs.red,
    glow: '#A8454A',
    fill: ORB_FILL,
    centerY: 0.5,
  },
  {
    key: 'orange',
    label: '활력·설렘',
    words: ['설렘', '의욕', '뿌듯함', '들뜸'],
    image: Orbs.orange,
    glow: '#A8683F',
    fill: ORB_FILL,
    centerY: 0.5,
  },
  {
    key: 'yellow',
    label: '기쁨·기대',
    words: ['기쁨', '기대', '홀가분함', '감사'],
    image: Orbs.yellow,
    glow: '#A8904A',
    fill: ORB_FILL,
    centerY: 0.5,
  },
];

export const getEmotion = (key: EmotionKey) => EMOTIONS.find((e) => e.key === key)!;

// 구슬이 화면에서 지름 `visible` 로 보이도록 이미지 크기·위치를 계산
export function orbImageStyle(key: EmotionKey, visible: number) {
  const { fill, centerY } = getEmotion(key);
  const size = visible / fill;
  return {
    width: size,
    height: size,
    transform: [{ translateY: -(centerY - 0.5) * size }],
  };
}

// 두 감정을 섞은 구슬 이미지 (없으면 undefined)
export const getMixOrb = (a: EmotionKey, b: EmotionKey) => MixOrbs[[a, b].sort().join('-')];

// 감정 1~2개를 구슬 하나로: 섞은 구슬이면 혼합 이미지, 아니면 그 색 구슬
export const orbSource = (emotions: EmotionKey[]) =>
  (emotions[1] && getMixOrb(emotions[0], emotions[1])) || getEmotion(emotions[0]).image;
