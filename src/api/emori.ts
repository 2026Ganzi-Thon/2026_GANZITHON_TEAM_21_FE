// EmOri API 호출 모음 (API 명세 0.1 + PRD v1.4)
// - 화면은 여기 함수만 부름. 경로·필드가 바뀌면 이 파일만 고치면 됨
// - USE_MOCK(서버 주소 없음)이면 지금까지 쓰던 가짜 데이터를 그대로 돌려줌
import { http, idem, toApiError, USE_MOCK } from '@/api/client';
import { toColor, toReceived, toServerRoute, toWeeks, topColor } from '@/api/mappers';
import type * as S from '@/api/types';
import { mockFriends, type Friend } from '@/mocks/social';
import { mockMe } from '@/mocks/me';
import { mockMineWeeks, mockRecordStartLabel, mockWeeks } from '@/mocks/record';
import { findReceived, mockInbox, mockLatestReceived, REACTION_EMOJIS } from '@/mocks/receive';
import { mockRequests, type FriendRequest } from '@/mocks/friendAdd';
import { mockSounds, type SoundItem } from '@/mocks/sounds';
import { signIn, signOut } from '@/stores/authStore';
import type { EmotionKey, ReceivedEmotion, SendRoute, WeekRecord } from '@/types/emotion';

const wait = <T>(v: T) => Promise.resolve(v);

// ───────────────── 로그인 (§2) ─────────────────
// 지섭님 결정(11/15): 아이디 + 비밀번호로 가입, 아이디 중복만 확인
export const auth = {
  async login(loginId: string, password: string) {
    if (USE_MOCK) return signIn('mock-token');
    const { data } = await http.post<{ session: S.Session }>('/auth/login', { loginId, password });
    await signIn(data.session.accessToken, data.session.refreshToken);
  },
  async signup(loginId: string, password: string) {
    if (USE_MOCK) return signIn('mock-token');
    const { data } = await http.post<{ session: S.Session }>('/auth/signup', {
      loginId,
      password,
      nickname: loginId, // 닉네임 단계가 없어서 아이디를 이름으로 씀
    });
    await signIn(data.session.accessToken, data.session.refreshToken);
  },
  async logout() {
    if (!USE_MOCK) await http.post('/auth/logout', {}).catch(() => {});
    await signOut();
  },
};

// ───────────────── 내 정보 (§2) ─────────────────
export type MyProfile = { name: string; friendCode: string; adult: boolean };
export const me = {
  async get(): Promise<MyProfile> {
    if (USE_MOCK) return { name: mockMe.name, friendCode: mockMe.id, adult: true };
    const { data } = await http.get<S.Me>('/me');
    return {
      name: data.nickname ?? data.friendCode ?? '',
      friendCode: data.friendCode ?? '',
      adult: data.adultStatus === 'VERIFIED_19_PLUS',
    };
  },
  async rename(nickname: string) {
    if (USE_MOCK) return;
    await http.put('/me/profile', { nickname });
  },
};
// QR 에 담는 친구 추가 주소 (스캔하면 friendCode 로 친구 요청)
export const friendLink = (friendCode: string) => `ganzithon21://friend/${friendCode}`;

// ───────────────── 카탈로그 (§3) ─────────────────
export const catalog = {
  // PRD 4-5, 5-2: 서비스가 제공하는 15초 이내 무보컬 소리
  async sounds(): Promise<SoundItem[]> {
    if (USE_MOCK) return wait(mockSounds);
    const { data } = await http.get<{ items: S.Sound[] }>('/catalog/sounds');
    return data.items.map((s) => ({
      id: s.id,
      title: s.title,
      seconds: Math.round(s.durationMs / 1000),
      source: { uri: s.playbackUrl },
    }));
  },
  // 익명 구슬 반응 목록 (code ↔ emoji)
  async reactions(): Promise<S.Reaction[]> {
    if (USE_MOCK) return wait(REACTION_EMOJIS.map((e) => ({ code: e, label: e, emoji: e })));
    const { data } = await http.get<{ items: S.Reaction[] }>('/catalog/reactions');
    return data.items;
  },
};

// ───────────────── 보내기 (§3) ─────────────────
export type SendResult = { dispatchId: string | null; cancelUntil: number | null };
export async function sendOrb(input: {
  emotions: EmotionKey[];
  soundId: string | null;
  route: SendRoute;
  friendIds: string[];
}): Promise<SendResult> {
  if (USE_MOCK) return { dispatchId: 'mock', cancelUntil: Date.now() + 5 * 60 * 1000 };
  // 1) 구슬 만들기 ★PRD 3-1: 단어가 아니라 색(구슬) 단위
  const { data: created } = await http.post<{ orb: S.Orb; recordId: string }>(
    '/orbs',
    { colors: input.emotions.map(toColor), soundId: input.soundId },
    idem(),
  );
  // 2) 전달 (나에게 / 친구 / 익명)
  const route = toServerRoute(input.route);
  const body = route === 'FRIEND' ? { route, friendIds: input.friendIds } : { route }; // ★FE 요청: 여러 명
  const { data: d } = await http.post<S.Dispatch>(
    `/orbs/${created.orb.id}/dispatches`,
    body,
    idem(),
  );
  return {
    dispatchId: d.id,
    cancelUntil: d.cancelUntil ? new Date(d.cancelUntil).getTime() : null,
  };
}

export async function cancelDispatch(dispatchId: string | null) {
  if (USE_MOCK || !dispatchId) return;
  await http.post(`/dispatches/${dispatchId}/cancel`, {}, idem());
}

// ───────────────── 받은 감정 (§4) ─────────────────
export const inbox = {
  async list(): Promise<ReceivedEmotion[]> {
    if (USE_MOCK) return wait(mockInbox);
    const { data } = await http.get<S.Page<S.Receipt>>('/inbox', { params: { limit: 50 } });
    return data.items.map((r) => toReceived(r));
  },
};

export type OpenedOrb = {
  received: ReceivedEmotion;
  replay: boolean; // 과거 기록 재진입 → 버튼 없음 (PRD 4-4)
  canReact: boolean; // 익명 + 최초 화면만 (PRD 4-3)
  actionToken: string | null;
};

// 처음 열면 open(최초 1회 열람 처리), 이미 열었거나 기록에서 들어오면 replay
export async function openReceipt(id: string | undefined, replay: boolean): Promise<OpenedOrb> {
  if (USE_MOCK) {
    const r = findReceived(id) ?? mockLatestReceived;
    return { received: r, replay, canReact: r.route === 'anonymous' && !replay, actionToken: null };
  }
  if (!id) throw toApiError(new Error('no id'));
  const view = replay
    ? (await http.get<S.SingleView>(`/receipts/${id}/replay`)).data
    : (await http.post<S.SingleView>(`/receipts/${id}/open`, {}, idem())).data;
  return {
    received: toReceived(view.receipt, view.orb),
    replay: view.mode === 'REPLAY',
    canReact: view.actions.includes('REACT'),
    actionToken: view.actionToken,
  };
}

export const receipt = {
  async react(id: string, token: string | null, code: string) {
    if (USE_MOCK) return;
    await http.post(`/receipts/${id}/reaction`, { actionToken: token, code }, idem());
  },
  // 조용히 듣기·닫기 → 최초 반응 기회 종료 (알림 없음)
  async finish(id: string, token: string | null) {
    if (USE_MOCK || !token) return;
    await http.post(`/receipts/${id}/finish`, { actionToken: token }).catch(() => {});
  },
  async report(id: string) {
    if (USE_MOCK) return;
    await http.post(`/receipts/${id}/reports`, { reasonCode: 'OTHER' }, idem());
  },
};

// ───────────────── 기록 (§4) ─────────────────
export type RecordBook = {
  startLabel: string; // '10월 6일~'
  weeks: WeekRecord[]; // 12칸
  thisWeekIndex: number; // 오늘이 속한 칸 (메인 구슬을 누르면 이 주의 상세 기록)
  topThisWeek: EmotionKey | null; // 이번 주 가장 많이 고른 색 → '내 감정' 구슬
  latestSender: string | null; // 가장 최근에 나에게 보낸 사람 (전체 감정 안내 문구)
};
export async function records(kind: 'mine' | 'all'): Promise<RecordBook> {
  if (USE_MOCK) {
    const weeks = kind === 'mine' ? mockMineWeeks : mockWeeks;
    return {
      startLabel: mockRecordStartLabel,
      weeks,
      thisWeekIndex: 0,
      topThisWeek: null,
      latestSender: kind === 'all' ? '서현' : null,
    };
  }
  const { data } = await http.get<S.Page<S.Record>>('/records', {
    params: { side: kind === 'mine' ? 'OWN' : undefined, limit: 100 },
  });
  const { startLabel, weeks, thisWeekIndex } = toWeeks(data.items, kind);
  // 이번 주(오늘이 속한 주)에 가장 많이 고른 색 → '내 감정' 구슬
  const thisWeek = weeks[thisWeekIndex];
  const latest = data.items.find((r) => r.side === 'RECEIVED'); // 최신순으로 옴
  return {
    startLabel,
    weeks,
    thisWeekIndex,
    topThisWeek: thisWeek ? topColor(thisWeek.entries) : null,
    latestSender: latest ? (latest.counterpart?.nickname ?? '익명의 누군가') : null,
  };
}

export async function deleteRecord(id: string) {
  if (USE_MOCK) return;
  await http.delete(`/records/${id}`);
}

// ───────────────── 친구 (§2) ─────────────────
export const friends = {
  async list(): Promise<Friend[]> {
    if (USE_MOCK) return wait(mockFriends);
    const { data } = await http.get<S.Page<S.UserSummary>>('/friends', { params: { limit: 100 } });
    return data.items.map((f) => ({ id: f.id, name: f.nickname, emotion: null, favorite: false }));
  },
  async remove(id: string) {
    if (USE_MOCK) return;
    await http.delete(`/friends/${id}`);
  },
  async requests(): Promise<FriendRequest[]> {
    if (USE_MOCK) return wait(mockRequests);
    const { data } = await http.get<S.Page<S.FriendRequest>>('/friend-requests', {
      params: { direction: 'INCOMING' },
    });
    return data.items
      .filter((r) => r.status === 'PENDING')
      .map((r) => ({ id: r.id, name: r.from.nickname, emotion: null }));
  },
  // 친구 코드(= 프로필 ID)로 요청
  async request(friendCode: string) {
    if (USE_MOCK) return;
    await http.post('/friend-requests', { friendCode });
  },
  async decide(id: string, accept: boolean) {
    if (USE_MOCK) return;
    await http.put(`/friend-requests/${id}/decision`, { decision: accept ? 'ACCEPT' : 'DECLINE' });
  },
};

// ───────────────── 설정·휴식·케어 (§5) ─────────────────
export const settings = {
  async get(): Promise<S.Settings | null> {
    if (USE_MOCK) return null;
    return (await http.get<S.Settings>('/me/settings')).data;
  },
  async patch(body: Partial<Pick<S.Settings, 'anonymousEnabled' | 'pushEnabled'>>) {
    if (USE_MOCK) return;
    await http.patch('/me/settings', body);
  },
  // 앱의 휴식 상태 → 서버 (날짜 'YYYY-MM-DD' 는 한국 시간 자정 기준)
  async rest(
    state: { mode: 'off' } | { mode: 'now' } | { mode: 'scheduled'; from: string; to: string },
  ) {
    if (USE_MOCK) return;
    const body =
      state.mode === 'off'
        ? { mode: 'OFF' }
        : state.mode === 'now'
          ? { mode: 'MANUAL' }
          : {
              mode: 'SCHEDULED',
              startsAt: `${state.from}T00:00:00+09:00`,
              endsAt: `${nextDay(state.to)}T00:00:00+09:00`, // 종료 제외 → 마지막 날 다음 자정
            };
    await http.put('/me/rest', body);
  },
};
const nextDay = (key: string) => {
  const d = new Date(`${key}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);
  const k = new Date(d.getTime() + 9 * 3600000).toISOString();
  return k.slice(0, 10);
};

export async function careLevel(): Promise<0 | 1 | 2 | null> {
  if (USE_MOCK) return null; // 목업: 기존 계산(mockMyDays) 사용
  const { data } = await http.get<S.Care>('/me/care');
  return data.level;
}
