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
