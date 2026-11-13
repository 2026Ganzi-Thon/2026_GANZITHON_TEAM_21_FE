// 가짜 데이터 - 백엔드 연동 시 감정 기록 API로 교체
import type { EmotionKey, RecordEntry, WeekRecord } from '@/types/emotion';

const sampleEntries: RecordEntry[] = [
  { id: 'e1', emotion: 'yellow', senderName: '서현', hasMusic: false, reactions: ['🥵'] },
  {
    id: 'e2',
    emotion: 'purple',
    senderName: '지환',
    hasMusic: true,
    reactions: ['🤢', '👻', '💩', '😿', '😊', '👍', '🙏'],
  },
  { id: 'e3', emotion: 'orange', senderName: '서현', hasMusic: false, reactions: ['🐱', '🤟'] },
  { id: 'e4', emotion: 'green', senderName: '나(본인)', hasMusic: false, reactions: ['🥵'] },
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
const mineEntries: RecordEntry[] = [
  { id: 'm1', emotion: 'blue', senderName: '서현', hasMusic: true, reactions: ['🥵'] },
  {
    id: 'm2',
    emotion: 'blue',
    senderName: '지환',
    hasMusic: false,
    reactions: ['🤢', '👻', '💩', '😿', '🙏'],
  },
  { id: 'm3', emotion: 'purple', senderName: '명철', hasMusic: false, reactions: ['🤟', '🐱'] },
  { id: 'm4', emotion: 'green', senderName: '나(본인)', hasMusic: true, reactions: [] },
];

export const mockMineWeeks: WeekRecord[] = mockWeeks.map((w) => ({
  ...w,
  entries: w.emotion ? mineEntries : [],
}));

export const getWeeks = (kind: 'mine' | 'group') => (kind === 'mine' ? mockMineWeeks : mockWeeks);
