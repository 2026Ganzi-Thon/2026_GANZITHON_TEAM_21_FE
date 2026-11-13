import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import IconButton from '@/components/IconButton';
import SideMenu from '@/components/SideMenu';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

type Props = {
  title: string;
  subtitle?: string;
  // 제목 옆 ⌄ 표시 (그룹 선택 등)
  onPressTitle?: () => void;
  onPressMenu?: () => void;
  onPressAddFriend?: () => void;
  onPressSettings?: () => void;
};

// 모든 메인 화면 공통 헤더: ☰  제목 ⌄  👤+ ⚙︎
// ☰ = 햄버거 메뉴, 👤+ = 친구 추가, ⚙︎ = 설정 화면 (기본 동작)
export default function AppHeader({
  title,
  subtitle,
  onPressTitle,
  onPressMenu,
  onPressAddFriend,
  onPressSettings,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <IconButton
          icon={Icons.menu}
          iconSize={27}
          onPress={onPressMenu ?? (() => setMenuOpen(true))}
          accessibilityLabel="메뉴"
        />

        <Pressable style={styles.titleWrap} onPress={onPressTitle} disabled={!onPressTitle}>
          <Text style={styles.title}>{title}</Text>
          {onPressTitle && (
            <Image source={Icons.chevronDown} style={styles.chevron} contentFit="contain" />
          )}
        </Pressable>

        <View style={styles.right}>
          <IconButton
            icon={Icons.userAdd}
            onPress={onPressAddFriend ?? (() => router.navigate('/friend-add'))}
            accessibilityLabel="친구 추가"
          />
          <IconButton
            icon={Icons.settings}
            iconSize={32}
            onPress={onPressSettings ?? (() => router.navigate('/settings'))}
            accessibilityLabel="설정"
          />
        </View>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* ☰ 누르면 햄버거 메뉴 (따로 onPressMenu 를 넘기지 않은 화면은 전부 이걸 씀) */}
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 21 },
  row: { height: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: -1,
  },
  title: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 24, color: Colors.textPrimary },
  chevron: { width: 20, height: 24 },
  right: { flexDirection: 'row', gap: 18 },
  subtitle: {
    marginTop: -4,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
