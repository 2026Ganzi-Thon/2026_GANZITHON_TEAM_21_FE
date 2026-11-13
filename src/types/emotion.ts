export type EmotionKey = 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'green';

export type Recipient = {
  id: string;
  name: string;
  avatar: number; // require() 이미지
};

// 받은 감정구슬 (최초 수신 화면에 표시)
export type ReceivedEmotion = {
  id: string;
  senderName: string;
  sentAtLabel: string; // '방금', '어제 21:10' 등 - 서버 시간으로 계산해서 넣기
  emotion: EmotionKey;
  music?: number; // 첨부 음악 (require() 오디오). 없으면 음악 기능 비활성화
  reacted: boolean; // 이미 반응했거나 조용히 듣기를 골랐는지
};

// 주차별 기록 - 한 주에 모인 감정들 (상세 기록 팝업에 표시)
export type RecordEntry = {
  id: string;
  emotion: EmotionKey;
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
