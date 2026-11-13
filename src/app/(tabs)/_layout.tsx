import { Tabs } from 'expo-router';

import TabBar from '@/components/TabBar';
import { Colors } from '@/constants/colors';

export default function TabsLayout() {
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
    </Tabs>
  );
}
