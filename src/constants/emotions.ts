import { Orbs } from '@/constants/assets';
import type { EmotionKey } from '@/types/emotion';

// 감정 휠의 7색 구슬 (휠 위 순서: 오른쪽 위 → 아래 → 왼쪽 위)
// label 은 임시 - 기획에서 색별 감정 이름 정해지면 수정
// fill / centerY: 이미지(1254px) 안에서 실제 구슬이 차지하는 비율과 세로 중심 위치
// - 구슬 이미지마다 투명 여백이 달라서, 이 값으로 보정해야 화면에서 크기가 똑같아 보임
// - 이미지를 바꾸면 다시 재야 함
export const EMOTIONS: {
  key: EmotionKey;
  label: string;
  image: number;
  glow: string;
  fill: number;
  centerY: number;
}[] = [
  { key: 'green', label: '평온', image: Orbs.green, glow: '#2F6B5E', fill: 0.872, centerY: 0.518 },
  { key: 'blue', label: '차분함', image: Orbs.blue, glow: '#5F7CA8', fill: 0.858, centerY: 0.538 },
  {
    key: 'purple',
    label: '생각이 많음',
    image: Orbs.purple,
    glow: '#5E4FA8',
    fill: 0.789,
    centerY: 0.532,
  },
  { key: 'pink', label: '설렘', image: Orbs.pink, glow: '#A85F8E', fill: 0.812, centerY: 0.524 },
  { key: 'red', label: '화남', image: Orbs.red, glow: '#A8454A', fill: 0.873, centerY: 0.514 },
  {
    key: 'orange',
    label: '신남',
    image: Orbs.orange,
    glow: '#A8683F',
    fill: 0.874,
    centerY: 0.515,
  },
  {
    key: 'yellow',
    label: '기쁨',
    image: Orbs.yellow,
    glow: '#A8904A',
    fill: 0.853,
    centerY: 0.519,
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
