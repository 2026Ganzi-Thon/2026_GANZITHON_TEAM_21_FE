import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { loadServerUrl, setOnSessionExpired } from '@/api/client';
import Cover from '@/components/Cover';
import NotificationBanner from '@/components/NotificationBanner';
import { Colors } from '@/constants/colors';
import { FontAssets } from '@/constants/typography';
import { signOut } from '@/stores/authStore';

// 토큰이 만료되고 갱신도 실패하면 로그인 화면으로 (명세 §1)
setOnSessionExpired(() => {
  void signOut();
});

SplashScreen.preventAutoHideAsync();

// 모바일 웹 전용 보정: 입력칸 포커스 테두리 / 탭할 때 파란 깜빡임 / 당겨서 새로고침 막기
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    input, textarea { outline: none !important; }
    * { -webkit-tap-highlight-color: transparent; }
    html, body { overscroll-behavior: none; background: #151515; }
  `;
  document.head.appendChild(style);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FontAssets);
  const [showCover, setShowCover] = useState(true);
  const hideCover = useCallback(() => setShowCover(false), []);
  // 숨은 메뉴에서 바꾼 서버 주소를 먼저 불러옴 (화면이 API 를 부르기 전에)
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    loadServerUrl().finally(() => setUrlReady(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && urlReady) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, urlReady]);

  if ((!fontsLoaded && !fontError) || !urlReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      </Stack>
      {/* 앱 안 알림 배너 (모든 화면 위) */}
      <NotificationBanner />
      {/* 앱 켤 때 커버 화면 → 로그인 상태에 따라 메인 / 로그인 */}
      {showCover && <Cover onDone={hideCover} />}
    </GestureHandlerRootView>
  );
}
