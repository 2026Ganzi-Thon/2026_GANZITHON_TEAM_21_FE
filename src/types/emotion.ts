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
