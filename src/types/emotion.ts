export type EmotionKey = 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'green';

export type Recipient = {
  id: string;
  name: string;
  avatar: number; // require() 이미지
};

// 전달 경로 (PRD v1.4 3-4): 가까운 사람(= 친구 목록에서 선택) / 나에게 / 익명
// 거리·위치 기반 탐색은 MVP 에서 제외
export type SendRoute = 'friends' | 'me' | 'anonymous';

// 받은 감정구슬 (최초 수신 화면에 표시)
export type ReceivedEmotion = {
  id: string;
  route: 'friends' | 'anonymous'; // 친구에게 받음: 반응 기능 없음 / 익명: 반응하기·조용히 듣기·신고
  senderName: string; // 익명이면 '익명'
  sentAtLabel: string; // '방금', '어제 21:10' 등 - 서버 시간으로 계산해서 넣기
  emotions: EmotionKey[]; // 1개 또는 섞은 2개 (PRD 3-3: 원본 감정 각각 보존)
  music?: number; // 첨부 음악 (require() 오디오). 없으면 음악 기능 비활성화
  reacted: boolean; // 이미 반응했거나 조용히 듣기를 골랐는지
};

// 주차별 기록 - 한 주에 모인 감정들 (상세 기록 팝업에 표시)
export type RecordEntry = {
  id: string;
  emotions: EmotionKey[]; // 1개 또는 섞은 2개
  receivedId?: string; // 내가 받은 구슬이면 수신 id → 누르면 단일 구슬 화면 재진입 (PRD 4-4)
  senderName: string; // 본인이면 '나(본인)'
  hasMusic: boolean;
  reactions: string[]; // 받은 반응 이모지
};

export type WeekRecord = {
  week: number; // 1주, 2주 ...
  label: string; // '10월 1주'
  emotion: EmotionKey | null; // 그 주 대표 구슬 색 (기록 없으면 null)
  entries: RecordEntry[];
};
