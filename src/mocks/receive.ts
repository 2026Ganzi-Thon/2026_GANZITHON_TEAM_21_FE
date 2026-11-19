// 가짜 데이터 - 백엔드 연동 시 수신함 API로 교체
import { SampleSounds, Sounds } from '@/constants/assets';
import type { ReceivedEmotion } from '@/types/emotion';

// 수신함 (최신순). 반응 탭은 맨 앞 구슬을 보여줌
export const mockInbox: ReceivedEmotion[] = [
  {
    id: 'r1',
    route: 'anonymous', // 익명으로 받음 → 반응하기 / 조용히 듣기 / 신고
    senderName: '익명',
    sentAtLabel: '방금',
    emotions: ['blue', 'purple'], // 섞은 구슬
    music: [SampleSounds.blue],
    reacted: false,
    opened: false,
  },
  {
    id: 'r2',
    route: 'friends', // 친구(가까운 사람)에게 받음 → 반응 기능 없음
    senderName: '서현',
    sentAtLabel: '10분 전',
    emotions: ['yellow'],
    music: [SampleSounds.yellow],
    reacted: false,
    opened: false,
  },
  {
    id: 'r3',
    route: 'friends',
    senderName: '지환',
    sentAtLabel: '어제',
    emotions: ['purple'],
    music: [Sounds.calm01],
    reacted: false,
    opened: true,
  },
  {
    id: 'r4',
    route: 'friends',
    senderName: '서현',
    sentAtLabel: '어제',
    emotions: ['orange'],
    reacted: false,
    opened: true,
  },
];

export const mockLatestReceived = mockInbox[0];

export const findReceived = (id?: string) => mockInbox.find((r) => r.id === id);

// 익명 구슬 반응 (백엔드 기본 세트 GET /catalog/reactions. 서버에는 code 를 보냄)
export const REACTIONS = [
  { code: 'HEART', label: '마음 전하기', emoji: '❤️' },
  { code: 'HUG', label: '안아주기', emoji: '🫂' },
  { code: 'CHEER', label: '응원하기', emoji: '🙌' },
];
export const reactionEmoji = (code: string) =>
  REACTIONS.find((r) => r.code === code)?.emoji ?? code;
