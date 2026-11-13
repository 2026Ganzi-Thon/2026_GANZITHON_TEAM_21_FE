// 가짜 데이터 - 백엔드 연동 시 내 감정 / 내가 속한 그룹 목록 API로 교체
import { Orbs } from '@/constants/assets';

export type HomeView = {
  key: string;
  kind: 'mine' | 'group';
  title: string;
  orb: number; // 이번 주 구슬 (여러 감정이 섞인 통합 오브제)
  message: string;
  // 가운데 구슬 링 색 (구슬 색에 맞춤)
  ring: { ringColor: string; glowColor: string; shadowColor: string };
};

const PINK_RING = { ringColor: '#241C2A', glowColor: '#E18ACD', shadowColor: '#0F1140' };
const BLUE_RING = { ringColor: '#1E2633', glowColor: '#8AA8E1', shadowColor: '#1F0F40' };

// 순서 = 페이지 점(● ○ ○) 순서. 0번은 항상 '내 감정'
export const mockViews: HomeView[] = [
  {
    key: 'mine',
    kind: 'mine',
    title: '내 감정',
    orb: Orbs.mine,
    message: '이번주 내 감정 구슬이에요.',
    ring: BLUE_RING,
  },
  {
    key: 'g1',
    kind: 'group',
    title: '그룹',
    orb: Orbs.group,
    message: '서현님이 가장 최근에 감정을 보냈어요.',
    ring: PINK_RING,
  },
  {
    key: 'g2',
    kind: 'group',
    title: '감정공유자들',
    orb: Orbs.group,
    message: '지환님이 가장 최근에 감정을 보냈어요.',
    ring: PINK_RING,
  },
  {
    key: 'g3',
    kind: 'group',
    title: '서현 외 3명',
    orb: Orbs.group,
    message: '명철님이 가장 최근에 감정을 보냈어요.',
    ring: PINK_RING,
  },
  {
    key: 'g4',
    kind: 'group',
    title: '동아리',
    orb: Orbs.group,
    message: '아직 이번 주 감정이 없어요.',
    ring: PINK_RING,
  },
];

export const mockWeekLabel = '10월 1주';
