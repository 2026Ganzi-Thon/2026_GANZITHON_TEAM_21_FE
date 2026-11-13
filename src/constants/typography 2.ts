// Pretendard 폰트 (assets/fonts) - 루트 _layout.tsx 에서 로드함
export const Fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export const FontAssets = {
  [Fonts.regular]: require('@/assets/fonts/Pretendard-Regular.otf'),
  [Fonts.medium]: require('@/assets/fonts/Pretendard-Medium.otf'),
  [Fonts.semiBold]: require('@/assets/fonts/Pretendard-SemiBold.otf'),
  [Fonts.bold]: require('@/assets/fonts/Pretendard-Bold.otf'),
};
