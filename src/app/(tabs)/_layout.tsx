import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';

import TabBar from '@/components/TabBar';
import { Colors } from '@/constants/colors';
import { notifyReceived } from '@/mocks/notifications';
import { useAuthStatus } from '@/stores/authStore';

let demoShown = false;

export default function TabsLayout() {
  const auth = useAuthStatus();

  // TODO: 시연용 가짜 알림. 연동 시 서버 푸시로 교체하고 이 부분 삭제
  useEffect(() => {
    if (auth !== 'in' || demoShown) return;
    demoShown = true;
    const t = setTimeout(notifyReceived, 3000);
    return () => clearTimeout(t);
  }, [auth]);
  if (auth === 'loading') return null; // 저장된 토큰 읽는 중 (커버가 덮고 있음)
  if (auth === 'out') return <Redirect href="/login" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}
    >
      {/* 순서 = 탭바 왼쪽→오른쪽 */}
      <Tabs.Screen name="reaction" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="record" />
      {/* 탭바에는 안 보이는 화면: 메인에서 가운데 구슬 한 번 더 누르면 열림 */}
      <Tabs.Screen name="send" />
      {/* 햄버거 메뉴에서 여는 화면들 (탭바는 그대로 보임) */}
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="payment" />
      <Tabs.Screen name="settings" />
      {/* 헤더 👤+ */}
      <Tabs.Screen name="friend-add" />
      {/* 설정 > 잠시 쉬기 / 홈 케어 카드 > 마음 돋보기 */}
      <Tabs.Screen name="rest" />
      {/* 수신함(반응 탭)에서 연 단일 감정구슬 화면 */}
      <Tabs.Screen name="received" />
      <Tabs.Screen name="care" />
    </Tabs>
  );
}
