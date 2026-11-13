import { BlurView } from 'expo-blur';
import { Image, type ImageSource } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const ITEMS: { label: string; icon: ImageSource; href: Href }[] = [
  { label: '프로필', icon: Icons.user, href: '/profile' },
  { label: '소셜 목록', icon: Icons.userGroup, href: '/social' },
  { label: '결제', icon: Icons.creditCard, href: '/payment' },
  { label: '설정', icon: Icons.settingsMenu, href: '/settings' },
];

// 햄버거(☰) 메뉴: 왼쪽에서 나오는 반투명 패널 (피그마 '햄버거')
export default function SideMenu({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const go = (href: Href) => {
    onClose();
    router.navigate(href);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {visible && (
        <>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="메뉴 닫기" />
          </Animated.View>

          {/* 헤더 ☰ 버튼과 같은 자리에 눌린 ☰ 버튼이 오도록 위치를 맞춤 */}
          <Animated.View
            entering={SlideInLeft.duration(240)}
            exiting={SlideOutLeft.duration(200)}
            style={[styles.panel, { top: insets.top - 7 }]}
          >
            {/* 뒤 화면 흐림 + 피그마 85% 어두운 막 */}
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.dim} />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="메뉴 닫기"
              hitSlop={8}
              style={styles.menuButton}
            >
              <Image source={Icons.menuPressed} style={styles.menuIcon} contentFit="contain" />
            </Pressable>

            <View style={styles.list}>
              {ITEMS.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => go(item.href)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                >
                  <Image source={item.icon} style={styles.itemIcon} contentFit="contain" />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    position: 'absolute',
    left: 0,
    bottom: 41,
    width: 183,
    overflow: 'hidden',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#8F8888',
  },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(21,21,21,0.7)' },
  // 눌린(오목한) 버튼
  menuButton: {
    position: 'absolute',
    left: 21,
    top: 14,
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      'inset -2px 2px 4px rgba(8,8,8,0.2), inset 2px -2px 4px rgba(8,8,8,0.2), inset -2px -2px 4px rgba(34,34,34,0.9), inset 2px 2px 5px rgba(8,8,8,0.9)',
  },
  menuIcon: { width: 27, height: 27 },
  list: { marginTop: 65 },
  item: { height: 42.3, flexDirection: 'row', alignItems: 'center', paddingLeft: 21 },
  pressed: { opacity: 0.6 },
  itemIcon: { width: 30, height: 30 },
  itemLabel: {
    position: 'absolute',
    left: 60,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
