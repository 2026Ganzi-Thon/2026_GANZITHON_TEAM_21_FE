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
    </Tabs>
  );
}
