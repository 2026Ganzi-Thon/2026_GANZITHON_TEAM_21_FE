// 서버가 주고받는 모양 (API 명세 0.1 기준, PRD v1.4에 맞게 고친 부분은 ★PRD 표시)
// 화면에서는 이 타입을 직접 쓰지 않고 mappers.ts 에서 앱 모양으로 바꿔서 씀

export type Color = 'YELLOW' | 'ORANGE' | 'PINK' | 'RED' | 'PURPLE' | 'BLUE' | 'GREEN';

// ★PRD 3-1: 사용자는 단어를 따로 고르지 않음. 구슬(색) 하나 = 감정 영역 + 단어 4개
export type Emotion = { color: Color; area: string; words: string[] };

export type Sound = { id: string; title: string; durationMs: number; playbackUrl: string };

export type Orb = {
  id: string;
  kind: 'SINGLE' | 'MIXED';
  emotions: Emotion[]; // 1~2개, 섞어도 각각 보존 (PRD 3-3)
  sound: Sound | null;
  createdAt: string;
};

export type ServerRoute = 'SELF' | 'FRIEND' | 'ANONYMOUS';

export type Dispatch = {
  id: string;
  orbId: string;
  route: ServerRoute;
  status: 'SAVED' | 'SENT' | 'CANCELLED';
  recipientCount: number;
  sentAt: string;
  cancelUntil: string | null;
};

export type UserSummary = { id: string; nickname: string };

export type Receipt = {
  id: string;
  route: 'FRIEND' | 'ANONYMOUS';
  sender: UserSummary | null; // 익명이면 null
  receivedAt: string;
  openedAt: string | null;
  orb?: Orb; // ★FE 요청: 수신함 목록에서 구슬을 보여주려면 필요
};

export type Record = {
  id: string;
  side: 'OWN' | 'RECEIVED';
  orb: Orb;
  route: ServerRoute | null;
  recordedAt: string;
  receiptId: string | null;
  dispatchId: string | null;
  counterpart?: UserSummary | null; // ★FE 요청: 받은 건 보낸 사람, 보낸 건 받은 사람(1명일 때)
};

export type RecordDetail = {
  record: Record;
  dispatch: Dispatch | null;
  sender: UserSummary | null;
  reactions: { code: string; count: number }[];
};

export type SingleView = {
  receipt: Receipt;
  orb: Orb;
  mode: 'FIRST' | 'REPLAY';
  actions: ('REACT' | 'QUIET')[];
  actionToken: string | null;
};

export type Reaction = { code: string; label: string; emoji: string };

export type Me = {
  id: string;
  nickname: string | null;
  friendCode: string | null;
  adultStatus: 'UNKNOWN' | 'VERIFIED_19_PLUS' | 'INELIGIBLE';
  onboardingStep?: string;
};

export type Session = { accessToken: string; refreshToken: string; expiresIn: number };

export type FriendRequest = {
  id: string;
  from: UserSummary;
  to: UserSummary;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
};

export type Rest = {
  mode: 'OFF' | 'MANUAL' | 'SCHEDULED';
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
};

export type Settings = { anonymousEnabled: boolean; pushEnabled: boolean; rest: Rest };

export type Care = {
  asOfDate: string;
  daysIn7: number;
  daysIn14: number;
  level: 0 | 1 | 2;
  resources: { id: string; title: string }[];
};

export type Page<T> = { items: T[]; nextCursor: string | null };
