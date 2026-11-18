// 서버가 주고받는 모양 (백엔드 API 명세 v0.3 + 기획 결정 11/16 반영 제안)
// 화면에서는 이 타입을 직접 쓰지 않고 mappers.ts 에서 앱 모양으로 바꿔서 씀
// ※ 11/16 기획 결정으로 백엔드가 바꾸는 중: 색 단위 저장, 샘플 음악, 생년월일
//    서버가 올라오면 실제 모양과 다시 맞출 것

export type Color = 'YELLOW' | 'ORANGE' | 'PINK' | 'RED' | 'PURPLE' | 'BLUE' | 'GREEN';

// 감정 하나 = 색 + 그 색에 매핑된 단어들 (기획 결정: 단어를 따로 고르지 않음)
// v0.3 처럼 단어 1개(word)로 와도 읽을 수 있게 둘 다 받음
export type Emotion = { id?: string; color: Color; area: string; words?: string[]; word?: string };

// 샘플 음악 (15초 이내, 무보컬). GET /catalog/sounds
export type Sound = {
  id: string;
  title: string;
  color: Color | null;
  durationMs: number;
  playbackUrl: string;
};

// 구슬에 붙은 음원. playbackUrl 은 로그인 토큰이 있어야 재생됨
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
  // UNKNOWN = 생년월일 없음. 자기신고 성인은 서버가 새 값을 추가할 예정 (string 으로 열어둠)
  adultStatus: 'UNKNOWN' | 'VERIFIED_19_PLUS' | 'INELIGIBLE' | (string & {});
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
