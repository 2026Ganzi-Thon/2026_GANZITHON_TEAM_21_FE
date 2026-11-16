// 서버가 주고받는 모양 (백엔드 API 명세 v0.3, 11/16 지섭님 브랜치 기준)
// 화면에서는 이 타입을 직접 쓰지 않고 mappers.ts 에서 앱 모양으로 바꿔서 씀

export type Color = 'YELLOW' | 'ORANGE' | 'PINK' | 'RED' | 'PURPLE' | 'BLUE' | 'GREEN';

// 고른 단어 하나. id = '소문자색_두자리순서' (예: yellow_03 = 홀가분함)
export type Emotion = { id: string; color: Color; area: string; word: string };

// AI ASMR 음원 (최대 30초, 구슬당 3곡). playbackUrl 은 로그인 토큰이 있어야 재생됨
export type Track = {
  id: string;
  order: number;
  title: string;
  durationMs: number;
  playbackUrl: string;
};
export type Playlist = { id: string; status: string; tracks: Track[] };

export type Orb = {
  id: string;
  kind: 'SINGLE' | 'MIXED';
  emotions: Emotion[]; // 1~2개 (서로 다른 색), 섞어도 각각 보존
  playlist: Playlist | null;
  createdAt: string;
};

export type GenerationStatus = 'QUEUED' | 'PROCESSING' | 'PARTIAL_FAILED' | 'FAILED' | 'READY';
export type GenerationTrack = {
  id: string;
  order: number;
  status: 'QUEUED' | 'PROCESSING' | 'FAILED' | 'READY';
  title: string | null;
  durationMs: number | null;
  playbackUrl: string | null;
  errorCode: string | null;
};
export type Generation = {
  id: string;
  orbId: string;
  status: GenerationStatus;
  trackCount: number;
  tracks: GenerationTrack[];
  createdAt: string;
  updatedAt: string;
};

export type ServerRoute = 'SELF' | 'FRIEND' | 'ANONYMOUS';

export type UserSummary = { id: string; nickname: string };

// 받은 사람 한 명 (익명이면 counterpart=null). 취소는 이 단위로
export type Target = {
  id: string;
  counterpart: UserSummary | null;
  status: 'DELIVERED' | 'CANCELLED';
  openedAt: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
};

export type Dispatch = {
  id: string;
  orbId: string;
  route: ServerRoute;
  status: 'SAVED' | 'SENT' | 'PARTIALLY_CANCELLED' | 'CANCELLED';
  recipientCount: number;
  sentAt: string;
  cancelUntil: string | null;
  targets: Target[];
};

export type Receipt = {
  id: string;
  route: 'FRIEND' | 'ANONYMOUS';
  sender: UserSummary | null; // 익명이면 null
  receivedAt: string;
  openedAt: string | null;
  orb: Orb;
};

export type Record = {
  id: string;
  side: 'OWN' | 'RECEIVED';
  orb: Orb;
  route: ServerRoute;
  recordedAt: string;
  receiptId: string | null;
  dispatchId: string | null;
  counterpart: UserSummary | null; // 친구 1명 전송·받은 구슬만, 익명·나에게는 null
};

export type RecordDetail = {
  record: Record;
  dispatch: Dispatch | null;
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

export type ReportReason = 'INAPPROPRIATE' | 'UNWANTED_REPEATED' | 'HARASSMENT_THREAT' | 'OTHER';

export type Me = {
  id: string;
  loginId: string;
  nickname: string;
  friendCode: string;
  adultStatus: 'UNKNOWN' | 'VERIFIED_19_PLUS' | 'INELIGIBLE';
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

// 케어: notice 가 있을 때만 홈 카드. 한 번 보거나 닫으면 그 단계는 다시 안 나옴
export type CareNotice = {
  id: string;
  level: 1 | 2;
  title: string;
  body: string;
  resources: { id: string; title: string }[];
};
export type Care = {
  asOfDate: string;
  timezone: string;
  daysIn7: number;
  daysIn14: number;
  level: 0 | 1 | 2;
  notice: CareNotice | null;
};

export type Page<T> = { items: T[]; nextCursor: string | null };
