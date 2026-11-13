import type { BottomTabBarProps } from 'expo-router/tabs';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons, Orbs } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

// 하단 탭바: 반응(♡) / 구슬(가운데 떠 있는 구슬) / 기록(🕒)
// 피그마 기준 300 x 121, 화면 하단에서 떠 있음
export const TAB_BAR_HEIGHT = 121;
export const TAB_BAR_BOTTOM_GAP = 29; // 홈 인디케이터 위 여백

const LABELS: Record<string, string> = { reaction: '반응', index: '구슬', record: '기록' };

export default function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_BOTTOM_GAP }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          const isCenter = route.name === 'index';

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              style={styles.item}
            >
              {focused && <View style={styles.activePill} />}
              {isCenter ? (
                <Image
                  source={focused ? Orbs.mono : Orbs.monoDim}
                  style={styles.centerOrb}
                  contentFit="contain"
                />
              ) : (
                <Image
                  source={route.name === 'reaction' ? Icons.heart : Icons.clock}
                  style={styles.icon}
                  contentFit="contain"
                  tintColor={focused ? Colors.textActive : undefined}
                />
              )}
              <Text style={[styles.label, focused && styles.labelActive]}>
                {LABELS[route.name]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    width: 300,
    height: 100,
    marginTop: 21,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 17, height: 17 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 16,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 9 },
  // 선택된 탭 뒤의 반투명 알약 배경
  activePill: {
    position: 'absolute',
    bottom: 9,
    width: 100,
    height: 82,
    borderRadius: 53,
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#4D4E51',
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 1 },
  },
  icon: { width: 67, height: 67, position: 'absolute', top: 6 },
  centerOrb: { width: 90, height: 90, position: 'absolute', top: -21 },
  label: { fontFamily: Fonts.semiBold, fontSize: 16, lineHeight: 19, color: Colors.textMuted },
  labelActive: { color: Colors.textActive },
});
