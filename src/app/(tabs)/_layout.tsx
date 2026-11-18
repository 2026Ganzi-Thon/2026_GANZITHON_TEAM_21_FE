import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { USE_MOCK } from '@/api/client';
import { inbox } from '@/api/emori';
import TabBar from '@/components/TabBar';
import { Colors } from '@/constants/colors';
import { notifyReceipt, notifyReceived } from '@/mocks/notifications';
import { useAuthStatus } from '@/stores/authStore';
import { setUnreadIds } from '@/stores/inboxStore';

let demoShown = false;

export default function TabsLayout() {
  const auth = useAuthStatus();

  // 새 구슬 알림 (앱 안 배너)
  // - 목업: 로그인 3초 뒤 가짜 알림 한 번
  // - 서버: 앱이 켜져 있는 동안 15초마다 수신함을 확인해서, 처음 보는 안 연 구슬이 있으면 배너
  //   (앱 밖 잠금화면 알림은 서버 푸시 - expo-notifications 연동 후)
  useEffect(() => {
    if (auth !== 'in') return;
    if (USE_MOCK) {
      if (demoShown) return;
      demoShown = true;
      const t = setTimeout(notifyReceived, 3000);
      return () => clearTimeout(t);
    }
    const seen = new Set<string>();
    let first = true; // 앱 켤 때 이미 있던 구슬은 알리지 않음
    const check = async () => {
      try {
        const fresh = await inbox.unread(); // GET /inbox?unreadOnly=true
        setUnreadIds(fresh.map((r) => r.id)); // 반응 탭 숫자
        const news = first ? undefined : fresh.find((r) => !seen.has(r.id));
        fresh.forEach((r) => seen.add(r.id));
        first = false;
        if (news) notifyReceipt(news);
      } catch {
        // 네트워크 오류는 다음 확인 때 다시
      }
    };
    void check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
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
