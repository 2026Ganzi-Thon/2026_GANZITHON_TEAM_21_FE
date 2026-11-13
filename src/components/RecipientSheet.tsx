import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import type { Recipient, SendRoute } from '@/types/emotion';

type Props = {
  visible: boolean;
  route: SendRoute;
  onChangeRoute: (route: SendRoute) => void;
  recipients: Recipient[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onBack: () => void; // ‹ 뒤로 가기 → 감정 다시 고르기
  onClose: () => void; // ×
  onSend: () => void;
};

const ROUTES: { key: SendRoute; label: string }[] = [
  { key: 'nearby', label: '가까운 사람' },
  { key: 'me', label: '나에게' },
  { key: 'anonymous', label: '익명으로' },
];

// 경로별 안내 문구 (기능명세 TR-02 / TR-07 / TR-08)
const ROUTE_INFO: Record<Exclude<SendRoute, 'nearby'>, string[]> = {
  me: ['감정구슬을 나에게 보관해요.', '내 감정 기록에서 다시 볼 수 있어요.'],
  anonymous: [
    '익명의 사용자 최대 3명에게 전달돼요.',
    '색과 감정 단어, 음악만 전달되고 누가 보냈는지는 알 수 없어요.',
  ],
};

// 공유자 선택 하단 시트 (피그마 '감정_보내기3/4', '가까운_사람_O')
// - 위쪽 드롭다운으로 전달 경로 선택: 가까운 사람 / 나에게 / 익명으로
// - 가까운 사람: 근처 조건을 충족한 친구만 선택 가능, 나머지는 '친구 목록'에 흐리게
export default function RecipientSheet({
  visible,
  route,
  onChangeRoute,
  recipients,
  selectedIds,
  onToggle,
  onBack,
  onClose,
  onSend,
}: Props) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = selectedIds.length;
  const nearby = recipients.filter((r) => r.nearby);
  const others = recipients.filter((r) => !r.nearby);

  const sendLabel =
    route === 'me'
      ? '나에게 보내기'
      : route === 'anonymous'
        ? '익명으로 보내기'
        : `${count} 곳에 보내기`;
  const canSend = route !== 'nearby' || count > 0;

  const renderRow = (r: Recipient, disabled: boolean) => {
    const on = selectedIds.includes(r.id);
    return (
      <Pressable
        key={r.id}
        onPress={() => onToggle(r.id)}
        disabled={disabled}
        style={[styles.row, disabled && styles.rowDisabled]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on, disabled }}
      >
        <Image source={r.avatar} style={styles.avatar} contentFit="cover" />
        <Text style={styles.name}>{r.name}</Text>
        <Image
          source={on ? Icons.radioOn : Icons.radioOff}
          style={styles.radio}
          contentFit="contain"
        />
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* 시트 바깥(위쪽) 탭하면 닫기 */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.handle} />

        <View style={styles.titleRow}>
          <Pressable style={styles.back} onPress={onBack} hitSlop={8}>
            <Image source={Icons.back} style={styles.backIcon} contentFit="contain" />
            <Text style={styles.backText}>뒤로 가기</Text>
          </Pressable>
          <Text style={styles.title}>공유자 선택</Text>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
            <Image source={Icons.close} style={styles.closeIcon} contentFit="contain" />
          </Pressable>
        </View>

        {/* 전달 경로 드롭다운 */}
        <View style={styles.routeWrap}>
          <Pressable
            style={styles.routeButton}
            onPress={() => setMenuOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="전달 경로 선택"
          >
            <Text style={styles.section}>{ROUTES.find((r) => r.key === route)!.label}</Text>
            <Image
              source={Icons.chevronDown}
              style={[styles.chevron, menuOpen && styles.chevronUp]}
              contentFit="contain"
              tintColor="#808B9F"
            />
          </Pressable>
          {menuOpen && (
            <View style={styles.menu}>
              {ROUTES.map((r) => (
                <Pressable
                  key={r.key}
                  style={styles.menuItem}
                  onPress={() => {
                    onChangeRoute(r.key);
                    setMenuOpen(false);
                  }}
                >
                  <Text style={[styles.menuText, r.key === route && styles.menuTextOn]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {route === 'nearby' ? (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {nearby.length === 0 && (
              <Text style={styles.empty}>지금 근처에 있는 친구가 없어요.</Text>
            )}
            {nearby.map((r) => renderRow(r, false))}
            {others.length > 0 && (
              <Text style={[styles.section, styles.sectionGap]}>친구 목록</Text>
            )}
            {others.map((r) => renderRow(r, true))}
          </ScrollView>
        ) : (
          <View style={styles.info}>
            <Text style={styles.infoTitle}>{ROUTE_INFO[route][0]}</Text>
            <Text style={styles.infoSub}>{ROUTE_INFO[route][1]}</Text>
          </View>
        )}

        {canSend && (
          <Pressable style={styles.sendButton} onPress={onSend}>
            <Text style={styles.sendText}>{sendLabel}</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    height: 392,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 9,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(235,235,245,0.3)',
  },
  titleRow: {
    height: 30,
    marginTop: 7,
    marginHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  backIcon: { width: 13, height: 17 },
  backText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  title: { fontFamily: Fonts.medium, fontSize: 17, color: Colors.white },
  close: { position: 'absolute', right: 0, width: 30, height: 30 },
  // close.svg 에 그림자 여백이 포함돼 있어서 버튼보다 크게 그림
  closeIcon: { position: 'absolute', left: -15, top: -15, width: 62, height: 62 },
  routeWrap: { marginTop: 10, marginHorizontal: 12, zIndex: 5 },
  routeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  section: { fontFamily: Fonts.medium, fontSize: 15, color: '#808B9F' },
  sectionGap: { marginTop: 10, marginLeft: -7 },
  chevron: { width: 14, height: 17 },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  menu: {
    position: 'absolute',
    top: 26,
    left: 0,
    width: 150,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 14 },
  menuText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary },
  menuTextOn: { fontFamily: Fonts.semiBold, color: Colors.white },
  list: { paddingTop: 11, paddingHorizontal: 19, paddingBottom: 90, gap: 13 },
  rowDisabled: { opacity: 0.35 },
  empty: {
    marginVertical: 12,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  info: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 70, gap: 8 },
  infoTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textSecondary },
  infoSub: {
    paddingHorizontal: 30,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
  },
  row: {
    height: 64,
    borderRadius: 17,
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 14,
    shadowColor: '#0C0C0C',
    shadowOffset: { width: 7, height: 7 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: { width: 37, height: 37, borderRadius: 19 },
  name: { flex: 1, marginLeft: 20, fontFamily: Fonts.regular, fontSize: 16, color: Colors.white },
  radio: { width: 24, height: 24 },
  sendButton: {
    position: 'absolute',
    left: 20,
    right: 19,
    top: 306,
    height: 55,
    borderRadius: 16,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F0F0F',
    shadowOffset: { width: 7, height: 7 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 8,
  },
  sendText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textActive },
});
