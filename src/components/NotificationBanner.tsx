import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Images } from '@/constants/assets';
import { Fonts } from '@/constants/typography';
import { dismissNotification, useCurrentNotification } from '@/stores/notificationStore';

const SHOW_MS = 4500; // 이만큼 보이고 자동으로 올라감
const HIDDEN_Y = -160;

// 앱 안 알림 배너 (피그마 '알림'): 위에서 내려오고, 위로 밀거나 4.5초 뒤 사라짐. 누르면 해당 화면으로
export default function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const n = useCurrentNotification();
  const y = useSharedValue(HIDDEN_Y);

  const hide = () => {
    'worklet';
    y.set(
      withTiming(HIDDEN_Y, { duration: 220, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(dismissNotification);
      }),
    );
  };

  useEffect(() => {
    if (!n) return;
    y.set(HIDDEN_Y);
    y.set(withSpring(0, { damping: 20, stiffness: 220 }));
    const t = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n?.id]);

  // 위로 밀어서 닫기 (아래로는 살짝만 늘어남)
  const swipe = Gesture.Pan()
    .onUpdate((e) => y.set(e.translationY < 0 ? e.translationY : e.translationY * 0.2))
    .onEnd((e) => {
      if (y.get() < -30 || e.velocityY < -500) hide();
      else y.set(withSpring(0, { damping: 20, stiffness: 220 }));
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  if (!n) return null;

  const open = () => {
    dismissNotification();
    if (n.href) router.navigate(n.href);
  };

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={[styles.wrap, { top: insets.top + 14 }, style]}>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={n.title}>
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Image source={Images.appIcon} style={styles.icon} contentFit="cover" />
            <View style={styles.texts}>
              <View style={styles.topRow}>
                <Text style={styles.app}>EmOri</Text>
                <Text style={styles.time}>지금</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {n.title}
              </Text>
              <Text style={styles.body} numberOfLines={1}>
                {n.body}
              </Text>
              {n.hint && (
                <Text style={styles.hint} numberOfLines={1}>
                  {n.hint}
                </Text>
              )}
            </View>
            {n.emoji && (
              <View style={styles.preview}>
                <Text style={styles.emoji}>{n.emoji}</Text>
              </View>
            )}
          </BlurView>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 15.5, right: 15.5, zIndex: 200 },
  card: {
    minHeight: 102,
    borderRadius: 22.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(37,37,37,0.53)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13.7,
    paddingRight: 17.6,
    paddingVertical: 13.7,
  },
  icon: { width: 37, height: 37, borderRadius: 9.8 },
  texts: { flex: 1, marginLeft: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  app: {
    fontFamily: Fonts.medium,
    fontSize: 12.7,
    lineHeight: 17.6,
    color: 'rgba(255,255,255,0.55)',
  },
  time: { fontSize: 12.7, lineHeight: 17.6, color: 'rgba(255,255,255,0.55)' },
  title: { fontFamily: Fonts.semiBold, fontSize: 15.6, lineHeight: 19.6, color: '#FFFFFF' },
  body: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 19.6, color: '#FFFFFF' },
  hint: { fontFamily: Fonts.regular, fontSize: 11.7, lineHeight: 17.6, color: '#FFFFFF' },
  preview: {
    position: 'absolute',
    right: 17.6,
    top: 38,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 32 },
});
