// 피그마 디자인 토큰 (EmOri - 다크 테마)
// 색상 하드코딩 금지 → 여기서 import 해서 쓰기
export const Colors = {
  background: '#151515', // 배경
  surface: '#151515',
  white: '#FFFFFF',
  textPrimary: '#F0F0F3', // Nue/white/1 - 큰 제목
  textSecondary: '#DDE3ED', // Neu/gray/300 - 본문
  textMuted: '#71757D', // 비활성 탭 라벨
  textActive: '#EEEEEE', // Nue/white/2 - 활성 탭 라벨
  gray500: '#5B6577',
  lime400: '#83DBD6',
  shadowDark: '#080808',
  shadowLight: '#222222',
} as const;

// 볼록한 카드 (프로필 이름/ID, 소셜 목록 줄)
export const NeuCard = {
  backgroundColor: '#1E1E1E',
  boxShadow:
    '-6px 6px 12px rgba(12,12,12,0.2), 6px -6px 12px rgba(12,12,12,0.2), -6px -6px 12px rgba(48,48,48,0.9), 6px 6px 16px rgba(12,12,12,0.9)',
} as const;
