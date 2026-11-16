// 서버 모양(api/types.ts) → 앱 화면 모양(types/emotion.ts) 변환
import type { Color, Orb, Receipt, Record, ServerRoute } from '@/api/types';
import type {
  EmotionKey,
  ReceivedEmotion,
  RecordEntry,
  SendRoute,
  WeekRecord,
} from '@/types/emotion';

// ── 색 ──
export const toKey = (c: Color) => c.toLowerCase() as EmotionKey;
export const toColor = (k: EmotionKey) => k.toUpperCase() as Color;
export const orbKeys = (orb?: Orb | null): EmotionKey[] =>
  orb?.emotions.length ? orb.emotions.map((e) => toKey(e.color)) : [];

// ── 전달 경로 ──
export const toServerRoute = (r: SendRoute): ServerRoute =>
  r === 'me' ? 'SELF' : r === 'anonymous' ? 'ANONYMOUS' : 'FRIEND';

// ── 시간 표시: '방금' / 'N분 전' / 'N시간 전' / '어제' / 'M월 D일' ──
export function timeLabel(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  const min = Math.floor((now - t) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const d = new Date(t);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (t >= startOfToday) return `${Math.floor(min / 60)}시간 전`;
  if (t >= startOfToday - 86400000) return '어제';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ── 받은 구슬 ──
export function toReceived(r: Receipt, orb?: Orb | null): ReceivedEmotion {
  const o = orb ?? r.orb ?? null;
  return {
    id: r.id,
    route: r.route === 'ANONYMOUS' ? 'anonymous' : 'friends',
    senderName: r.sender?.nickname ?? '익명',
    sentAtLabel: timeLabel(r.receivedAt),
    emotions: orbKeys(o).length ? orbKeys(o) : ['blue'], // 구슬 정보가 없으면 기본 색
    music: o?.sound ? { uri: o.sound.playbackUrl } : undefined,
    reacted: false,
    opened: !!r.openedAt,
  };
}

// ── 기록 → 주차별 (월요일 시작, 12칸) ──
const DAY = 86400000;
const mondayOf = (t: number) => {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7; // 월=0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
};
const weekOfMonth = (t: number) => {
  const d = new Date(t);
  return Math.floor((d.getDate() - 1) / 7) + 1;
};

// 그 주에 가장 많이 나온 색 (섞은 구슬은 두 색 각각 1번씩)
export function topColor(entries: { emotions: EmotionKey[] }[]): EmotionKey | null {
  const counts = new Map<EmotionKey, number>();
  entries.forEach((e) => e.emotions.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function counterpartName(r: Record, kind: 'mine' | 'all') {
  if (r.side === 'RECEIVED')
    return r.counterpart?.nickname ?? (r.route === 'ANONYMOUS' ? '익명' : '친구');
  if (kind === 'all') return '나(본인)';
  // 내 감정 화면: '내 감정 받은이' 칸
  if (r.route === 'SELF' || r.route === null) return '나에게';
  if (r.route === 'ANONYMOUS') return '익명';
  return r.counterpart?.nickname ?? '친구';
}

export function toEntry(r: Record, kind: 'mine' | 'all'): RecordEntry {
  return {
    id: r.id,
    emotions: orbKeys(r.orb),
    receivedId: r.side === 'RECEIVED' ? (r.receiptId ?? undefined) : undefined,
    senderName: counterpartName(r, kind),
    hasMusic: !!r.orb.sound,
    reactions: [], // 반응은 상세(GET /records/{id})에만 있음
  };
}

export function toWeeks(records: Record[], kind: 'mine' | 'all', now = Date.now()) {
  const thisMonday = mondayOf(now);
  const oldest = records.reduce(
    (m, r) => Math.min(m, mondayOf(new Date(r.recordedAt).getTime())),
    thisMonday,
  );
  // 이번 주를 포함한 12칸 (기록이 12주보다 오래됐으면 최근 12주)
  const start = Math.max(oldest, thisMonday - 11 * 7 * DAY);
  const weeks: WeekRecord[] = Array.from({ length: 12 }, (_, i) => {
    const from = start + i * 7 * DAY;
    const to = from + 7 * DAY;
    const entries = records
      .filter((r) => {
        const t = new Date(r.recordedAt).getTime();
        return t >= from && t < to;
      })
      .map((r) => toEntry(r, kind));
    const d = new Date(from);
    return {
      week: i + 1,
      label: `${d.getMonth() + 1}월 ${weekOfMonth(from)}주`,
      emotion: topColor(entries),
      entries,
    };
  });
  const s = new Date(start);
  const thisWeekIndex = Math.round((thisMonday - start) / (7 * DAY));
  return { startLabel: `${s.getMonth() + 1}월 ${s.getDate()}일~`, weeks, thisWeekIndex };
}
