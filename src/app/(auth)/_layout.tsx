import { Stack } from 'expo-router';

import { Colors } from '@/constants/colors';

// 로그인 전 화면들 (탭바 없음)
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
