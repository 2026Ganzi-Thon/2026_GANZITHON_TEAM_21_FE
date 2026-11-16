// EmOri API 호출 모음 (백엔드 API 명세 v0.3 + PRD v1.4)
// - 화면은 여기 함수만 부름. 경로·필드가 바뀌면 이 파일만 고치면 됨
// - USE_MOCK(서버 주소 없음)이면 가짜 데이터로 동작 (부스 시연용 안전장치)
import { ApiError, http, idem, toApiError, USE_MOCK } from '@/api/client';
import { toReceived, toServerRoute, toTracks, toWeeks, topColor } from '@/api/mappers';
import type * as S from '@/api/types';
import { emotionId } from '@/constants/emotions';
import { mockFriends, type Friend } from '@/mocks/social';
import { mockMe } from '@/mocks/me';
import { mockMineWeeks, mockRecordStartLabel, mockWeeks } from '@/mocks/record';
import {
  findReceived,
  mockInbox,
  mockLatestReceived,
  mockPlaylist,
  REACTIONS,
} from '@/mocks/receive';
import { mockRequests, type FriendRequest } from '@/mocks/friendAdd';
import { signIn, signOut } from '@/stores/authStore';
import type {
  AudioSource,
  EmotionKey,
  EmotionPick,
  ReceivedEmotion,
  SendRoute,
  WeekRecord,
} from '@/types/emotion';

const wait = <T>(v: T, ms = 0) => new Promise<T>((r) => setTimeout(() => r(v), ms));

// 목록은 nextCursor 가 null 이 될 때까지 다 읽음 (명세 §1: 첫 100개로 끝내지 않기)
async function readAll<T>(path: string, params: object = {}): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const { data }: { data: S.Page<T> } = await http.get<S.Page<T>>(path, {
      params: { ...params, limit: 100, cursor: cursor ?? undefined },
    });
    items.push(...data.items);
    cursor = data.nextCursor;
  } while (cursor);
  return items;
}

// ───────────────── 로그인 (§3) ─────────────────
// 아이디: 소문자·숫자·밑줄 4~20자 (대문자는 서버가 소문자로 바꿈), 비밀번호: 8~72바이트
export const LOGIN_ID_RULE = /^[a-z0-9_]{4,20}$/;
export const passwordBytes = (pw: string) => new TextEncoder().encode(pw).length;

export const auth = {
  async login(loginId: string, password: string) {
    if (USE_MOCK) return signIn('mock-token');
    const { data } = await http.post<{ session: S.Session }>('/auth/login', { loginId, password });
    const { accessToken, refreshToken, expiresIn } = data.session;
    await signIn(accessToken, refreshToken, expiresIn);
  },
  // 가입: 닉네임을 안 보내면 서버가 아이디로 채움
  async signup(loginId: string, password: string) {
    if (USE_MOCK) return signIn('mock-token');
    const { data } = await http.post<{ session: S.Session }>('/auth/signup', { loginId, password });
    const { accessToken, refreshToken, expiresIn } = data.session;
    await signIn(accessToken, refreshToken, expiresIn);
  },
  // 아이디 중복 확인 (GET /auth/login-id-availability)
  async available(loginId: string): Promise<boolean> {
    if (USE_MOCK) return true;
    const { data } = await http.get<{ available: boolean }>('/auth/login-id-availability', {
      params: { loginId },
    });
    return data.available;
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
      name: data.nickname || data.loginId,
      friendCode: data.friendCode,
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

// ───────────────── 반응 목록 (§5) ─────────────────
// 기본 3개: 마음 전하기 ❤️ / 안아주기 🫂 / 응원하기 🙌. 서버에는 code 를 보냄
export const catalog = {
  async reactions(): Promise<S.Reaction[]> {
    if (USE_MOCK) return wait(REACTIONS);
    const { data } = await http.get<{ items: S.Reaction[] }>('/catalog/reactions');
    return data.items;
  },
};

// ───────────────── 구슬 만들기 (§5) ─────────────────
// 고른 단어(색마다 1개, 최대 2색) → 초안 구슬. 아직 기록·전송 전
// key: 같은 동작을 다시 보낼 때(네트워크 재시도)만 같은 키
export async function createOrb(picks: EmotionPick[], key?: string): Promise<string> {
  if (USE_MOCK) return wait(`mock_${Date.now()}`, 300);
  const { data } = await http.post<{ orb: S.Orb }>(
    '/orbs',
    { emotionIds: picks.map((p) => emotionId(p.key, p.word)) },
    idem(key),
  );
  return data.orb.id;
}

// ───────────────── AI 음악 (§6) ─────────────────
// 생성 요청 → 약 3초마다 상태 확인 → READY 면 3곡 재생 가능
// 실패한 곡만 retry, 음악 없이 보내려면 detach
export type MusicJob = {
  id: string;
  status: S.GenerationStatus;
  done: number; // 완성된 곡 수
  total: number; // 3
  tracks: AudioSource[]; // 완성된 곡 (순서대로)
};
const toJob = (g: S.Generation): MusicJob => {
  const ready = g.tracks.filter((t) => t.status === 'READY' && t.playbackUrl);
  return {
    id: g.id,
    status: g.status,
    done: ready.length,
    total: g.trackCount || g.tracks.length || 3,
    tracks: toTracks(ready.map((t) => ({ order: t.order, playbackUrl: t.playbackUrl! }))),
  };
};
// 목업: 생성 시작 후 약 6초 뒤 완성
const mockJobs = new Map<string, number>();
const mockJob = (id: string): MusicJob => {
  const elapsed = Date.now() - (mockJobs.get(id) ?? Date.now());
  const done = Math.min(3, Math.floor(elapsed / 2000));
  return {
    id,
    status: done >= 3 ? 'READY' : 'PROCESSING',
    done,
    total: 3,
    tracks: mockPlaylist.slice(0, done),
  };
};

export const music = {
  async start(orbId: string, description: string, key?: string): Promise<MusicJob> {
    if (USE_MOCK) {
      const id = `job_${orbId}`;
      mockJobs.set(id, Date.now());
      return wait(mockJob(id), 300);
    }
    const text = description.trim();
    const { data } = await http.post<S.Generation>(
      `/orbs/${orbId}/asmr-generations`,
      text ? { description: text } : {},
      idem(key),
    );
    return toJob(data);
  },
  async status(jobId: string): Promise<MusicJob> {
    if (USE_MOCK) return wait(mockJob(jobId));
    return toJob((await http.get<S.Generation>(`/asmr-generations/${jobId}`)).data);
  },
  // 실패한 곡만 다시 만들기 (성공한 곡은 그대로)
  async retry(jobId: string, key?: string): Promise<MusicJob> {
    if (USE_MOCK) return wait(mockJob(jobId));
    return toJob(
      (await http.post<S.Generation>(`/asmr-generations/${jobId}/retry`, {}, idem(key))).data,
    );
  },
  // 음악 떼기 → 음악 없이 보내기 가능
  async detach(orbId: string) {
    if (USE_MOCK) return;
    await http.delete(`/orbs/${orbId}/playlist`);
  },
};
export const isMusicDone = (s: S.GenerationStatus) =>
  s === 'READY' || s === 'FAILED' || s === 'PARTIAL_FAILED';

// ───────────────── 보내기·취소 (§7) ─────────────────
// 친구는 한 번에 1명 (friendId). 익명은 서버가 1~3명 매칭
export type SentTarget = {
  id: string;
  name: string | null;
  canCancel: boolean;
  cancelled: boolean;
};
export type SendResult = {
  dispatchId: string | null;
  cancelUntil: number | null;
  recipientCount: number;
  targets: SentTarget[];
};
const toSent = (d: S.Dispatch): SendResult => ({
  dispatchId: d.id,
  cancelUntil: d.cancelUntil ? new Date(d.cancelUntil).getTime() : null,
  recipientCount: d.recipientCount,
  targets: d.targets.map((t) => ({
    id: t.id,
    name: t.counterpart?.nickname ?? null,
    canCancel: t.canCancel,
    cancelled: t.status === 'CANCELLED',
  })),
});

export async function dispatchOrb(
  orbId: string,
  route: SendRoute,
  friendId: string | null,
  key?: string,
): Promise<SendResult> {
  if (USE_MOCK) {
    const n = route === 'me' ? 0 : route === 'anonymous' ? 3 : 1;
    return wait(
      {
        dispatchId: route === 'me' ? null : 'mock',
        cancelUntil: route === 'me' ? null : Date.now() + 5 * 60 * 1000,
        recipientCount: n,
        targets: Array.from({ length: n }, (_, i) => ({
          id: `t${i}`,
          name: null,
          canCancel: true,
          cancelled: false,
        })),
      },
      300,
    );
  }
  const r = toServerRoute(route);
  const body = r === 'FRIEND' ? { route: r, friendId } : { route: r };
  const { data } = await http.post<{ dispatch: S.Dispatch; recordId: string }>(
    `/orbs/${orbId}/dispatches`,
    body,
    idem(key),
  );
  return toSent(data.dispatch);
}

// 보내기 취소: 받은 사람마다 따로 (5분 이내 + 안 열어본 사람만)
// 아직 취소할 수 있는 사람을 모두 취소하고, 남은 결과를 돌려줌
export async function cancelSent(
  dispatchId: string | null,
): Promise<{ cancelled: number; kept: number }> {
  if (USE_MOCK || !dispatchId) return { cancelled: 1, kept: 0 };
  const { data } = await http.get<S.Dispatch>(`/dispatches/${dispatchId}`);
  let cancelled = 0;
  for (const t of data.targets) {
    if (t.status === 'CANCELLED') continue;
    if (!t.canCancel) continue;
    try {
      await http.post(`/dispatches/${dispatchId}/targets/${t.id}/cancel`, {}, idem());
      cancelled += 1;
    } catch (e) {
      if (toApiError(e).code !== 'CANCEL_NOT_ALLOWED') throw e;
    }
  }
  const alive = data.targets.filter((t) => t.status !== 'CANCELLED').length;
  // 한 명도 취소 못 했으면 (다 열어봤거나 5분 지남) 오류로 알림
  if (cancelled === 0 && alive > 0)
    throw new ApiError(
      409,
      'CANCEL_NOT_ALLOWED',
      '이미 열람했거나 취소할 수 있는 시간이 지났어요.',
    );
  return { cancelled, kept: alive - cancelled };
}

// ───────────────── 받은 감정 (§4) ─────────────────
export const inbox = {
  // 받은 감정 화면: 전부
  async list(): Promise<ReceivedEmotion[]> {
    if (USE_MOCK) return wait(mockInbox);
    return (await readAll<S.Receipt>('/inbox')).map((r) => toReceived(r));
  },
  // 15초 확인용: 안 연 것만 한 페이지
  async unread(): Promise<ReceivedEmotion[]> {
    if (USE_MOCK) return wait(mockInbox.filter((r) => !r.opened));
    const { data } = await http.get<S.Page<S.Receipt>>('/inbox', {
      params: { unreadOnly: true, limit: 20 },
    });
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
  // 신고: 사유 필수, '기타'일 때만 내용 (1~500자)
  async report(id: string, reason: S.ReportReason, detail?: string) {
    if (USE_MOCK) return;
    const text = detail?.trim();
    const body =
      reason === 'OTHER' && text ? { reasonCode: reason, detail: text } : { reasonCode: reason };
    await http.post(`/receipts/${id}/reports`, body, idem());
  },
  // 익명 보낸 사람 차단 (앞으로 서로 익명 매칭 안 됨). 신고와 별개
  async block(id: string) {
    if (USE_MOCK) return;
    await http.put(`/receipts/${id}/anonymous-block`, {});
  },
};

export const REPORT_REASONS: { code: S.ReportReason; label: string }[] = [
  { code: 'INAPPROPRIATE', label: '불쾌하거나 부적절한 감정 전달' },
  { code: 'UNWANTED_REPEATED', label: '반복적인 원치 않는 전송' },
  { code: 'HARASSMENT_THREAT', label: '괴롭힘 및 위협' },
  { code: 'OTHER', label: '기타' },
];

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
  // 이번 주 포함 최근 12주 (월요일 시작), cursor 끝까지
  const items = await readAll<S.Record>('/records', {
    side: kind === 'mine' ? 'OWN' : undefined,
    from: twelveWeeksAgo(),
  });
  const { startLabel, weeks, thisWeekIndex } = toWeeks(items, kind);
  // 이번 주(오늘이 속한 주)에 가장 많이 고른 색 → '내 감정' 구슬
  const thisWeek = weeks[thisWeekIndex];
  const latest = items.find((r) => r.side === 'RECEIVED'); // 최신순으로 옴
  return {
    startLabel,
    weeks,
    thisWeekIndex,
    topThisWeek: thisWeek ? topColor(thisWeek.entries) : null,
    latestSender: latest ? (latest.counterpart?.nickname ?? '익명의 누군가') : null,
  };
}

// 12주 전 월요일 (한국 날짜 'YYYY-MM-DD')
function twelveWeeksAgo(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600000); // UTC 기준으로 한국 날짜 계산
  const day = (kst.getUTCDay() + 6) % 7; // 월=0
  kst.setUTCDate(kst.getUTCDate() - day - 11 * 7);
  return kst.toISOString().slice(0, 10);
}

// 상세 기록 팝업용: 받은 반응 (익명은 합계만)
export async function recordReactions(id: string): Promise<{ code: string; count: number }[]> {
  if (USE_MOCK) return [];
  return (await http.get<S.RecordDetail>(`/records/${id}`)).data.reactions;
}

export async function deleteRecord(id: string) {
  if (USE_MOCK) return;
  await http.delete(`/records/${id}`);
}

// ───────────────── 친구 (§2) ─────────────────
export const friends = {
  async list(): Promise<Friend[]> {
    if (USE_MOCK) return wait(mockFriends);
    const items = await readAll<S.UserSummary>('/friends');
    return items.map((f) => ({ id: f.id, name: f.nickname, emotion: null, favorite: false }));
  },
  async remove(id: string) {
    if (USE_MOCK) return;
    await http.delete(`/friends/${id}`);
  },
  async requests(): Promise<FriendRequest[]> {
    if (USE_MOCK) return wait(mockRequests);
    const items = await readAll<S.FriendRequest>('/friend-requests', { direction: 'INCOMING' });
    return items
      .filter((r) => r.status === 'PENDING')
      .map((r) => ({ id: r.id, name: r.from.nickname, emotion: null }));
  },
  // 친구 코드(= 프로필 ID)로 요청
  async request(friendCode: string) {
    if (USE_MOCK) return;
    await http.post('/friend-requests', { friendCode: friendCode.trim().toLowerCase() });
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
              startsAt: kstMidnightUtc(state.from),
              endsAt: kstMidnightUtc(nextDay(state.to)), // 종료 제외 → 마지막 날 다음 자정
            };
    await http.put('/me/rest', body);
  },
};
// 'YYYY-MM-DD' 한국 자정 → UTC ISO (명세 예: 11/16 → 2026-11-15T15:00:00Z)
const kstMidnightUtc = (key: string) =>
  new Date(`${key}T00:00:00+09:00`).toISOString().replace('.000Z', 'Z');
const nextDay = (key: string) => {
  const d = new Date(`${key}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);
  const k = new Date(d.getTime() + 9 * 3600000).toISOString();
  return k.slice(0, 10);
};

// 케어 (§11): level = 지금 조건 단계, notice = 이번에 보여줄 안내 (이미 보거나 닫았으면 null)
export async function care(): Promise<S.Care | null> {
  if (USE_MOCK) return null; // 목업: 기존 계산(mockMyDays) 사용
  return (await http.get<S.Care>('/me/care')).data;
}
// 카드를 눌러 상세로 가면 VIEWED, 닫으면 DISMISSED → 그 단계는 다시 안 나옴
export async function ackCare(noticeId: string, action: 'VIEWED' | 'DISMISSED') {
  if (USE_MOCK) return;
  await http.put(`/me/care/notices/${noticeId}/acknowledgement`, { action }).catch(() => {});
}
