// 가짜 데이터 - 백엔드 연동 시 감정 기록 API로 교체
import type { EmotionKey, RecordEntry, WeekRecord } from '@/types/emotion';

// receivedId 가 있는 줄 = 내가 받은 구슬 → 누르면 그때의 수신 화면으로 재진입
const sampleEntries: RecordEntry[] = [
  {
    id: 'e1',
    emotions: ['yellow'],
    receivedId: 'r2',
    senderName: '서현',
    hasMusic: true,
    reactions: [],
  },
  {
    id: 'e2',
    emotions: ['purple'],
    receivedId: 'r3',
    senderName: '지환',
    hasMusic: true,
    reactions: [],
  },
  {
    id: 'e5',
    emotions: ['blue', 'purple'],
    receivedId: 'r1',
    senderName: '익명',
    hasMusic: true,
    reactions: ['🙏'],
  },
  {
    id: 'e3',
    emotions: ['orange'],
    receivedId: 'r4',
    senderName: '서현',
    hasMusic: false,
    reactions: [],
  },
  {
    id: 'e4',
    emotions: ['green', 'yellow'],
    senderName: '나(본인)',
    hasMusic: false,
    reactions: ['🤗', '👍', '💚', '🙌'],
  },
];

// 피그마 '주차별_기록': 1~7주는 기록 있음, 8~12주는 비어 있음
const weekColors: (EmotionKey | null)[] = [
  'pink',
  'yellow',
  'blue',
  'orange',
  'purple',
  'pink',
  'green',
  null,
  null,
  null,
  null,
  null,
];

export const mockRecordStartLabel = '10월 6일~';

export const mockWeeks: WeekRecord[] = weekColors.map((emotion, i) => ({
  week: i + 1,
  label: `${10 + Math.floor(i / 4)}월 ${(i % 4) + 1}주`,
  emotion,
  entries: emotion ? sampleEntries : [],
}));

// 내 감정 기록: '보낸이' 대신 '내 감정 받은이'가 들어감 (피그마 '상세기록-개인')
// 반응은 익명으로 보낸 구슬에만 달림 (친구에게 보낸 구슬은 반응 기능 없음, PRD 5-1)
const mineEntries: RecordEntry[] = [
  { id: 'm1', emotions: ['blue'], senderName: '서현', hasMusic: true, reactions: [] },
  { id: 'm2', emotions: ['blue', 'purple'], senderName: '지환', hasMusic: false, reactions: [] },
  {
    id: 'm3',
    emotions: ['purple'],
    senderName: '익명',
    hasMusic: false,
    reactions: ['🤗', '🙏', '💜', '🫂', '✨'],
  },
  { id: 'm4', emotions: ['green'], senderName: '나(본인)', hasMusic: true, reactions: [] },
];

export const mockMineWeeks: WeekRecord[] = mockWeeks.map((w) => ({
  ...w,
  entries: w.emotion ? mineEntries : [],
}));

export const getWeeks = (kind: 'mine' | 'group') => (kind === 'mine' ? mockMineWeeks : mockWeeks);
