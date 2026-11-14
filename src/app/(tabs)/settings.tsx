import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import Toggle from '@/components/Toggle';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { signOut } from '@/stores/authStore';
import { notify, confirm } from '@/utils/dialog';

type ToggleKey = 'anonymous' | 'push' | 'mindLens' | 'swipeMusic';

type Row =
  | { kind: 'toggle'; key: ToggleKey; title: string; desc: string }
  | { kind: 'link'; title: string; desc: string };

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: '계정',
    rows: [
      { kind: 'link', title: '연동 된 계정 확인', desc: 'EmOri와 연동 된 타 플랫폼의 계정을 관리' },
      { kind: 'link', title: '정보 수정', desc: '아이디·비밀번호 등 보안 정보 확인 및 수정' },
    ],
  },
  {
    title: '보내기 & 받기',
    rows: [
      {
        kind: 'toggle',
        key: 'anonymous',
        title: '익명 구슬 받기',
        desc: '익명으로 아무에게 감정을 주고 받기(성인 전용)',
      },
    ],
  },
  {
    title: '알림과 휴식',
    rows: [
      { kind: 'toggle', key: 'push', title: '알림', desc: '모든 PUSH 알림을 받기' },
      { kind: 'link', title: '잠시 쉬기', desc: '알림이 꺼지는 시간을 정하기' },
      {
        kind: 'link',
        title: '조용히 들어주는 시간',
        desc: '자동으로 조용히 들어주기가 활성화 되는 시간을 정하기',
      },
    ],
  },
  {
    title: '도움과 소리',
    rows: [
      {
        kind: 'toggle',
        key: 'mindLens',
        title: '마음 돋보기 안내',
        desc: '반복되는 무거운 감정에 대해 안내받기',
      },
      {
        kind: 'toggle',
        key: 'swipeMusic',
        title: '구슬 음악 듣기',
        desc: '음악이 들은 구슬은 스와이프로 재생하기',
      },
    ],
  },
];

// 햄버거 > 설정 / 헤더 ⚙︎ (피그마 '설정')
export default function SettingsScreen() {
  // TODO: 설정 조회/저장 API
  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    anonymous: false,
    push: true,
    mindLens: true,
    swipeMusic: true,
  });

  const set = (key: ToggleKey, next: boolean) => setValues((prev) => ({ ...prev, [key]: next }));

  const onToggle = (key: ToggleKey, next: boolean) => {
    // 익명 구슬은 성인만 (기능명세 TR-07) - 연동 시 성인 인증 여부로 막기
    if (key === 'anonymous' && next) {
      confirm({
        title: '익명 구슬 받기',
        message: '만 19세 이상만 사용할 수 있어요. 켤까요?',
        okText: '켜기',
        onOk: () => set(key, true),
      });
      return;
    }
    set(key, next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="설정" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, i) => (
                <Fragment key={row.title}>
                  {i > 0 && <View style={styles.divider} />}
                  <Pressable
                    disabled={row.kind === 'toggle'}
                    onPress={() => notify(row.title, '준비 중이에요.')} // TODO: 상세 화면
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.texts}>
                      <Text style={styles.rowTitle}>{row.title}</Text>
                      <Text style={styles.rowDesc} numberOfLines={1}>
                        {row.desc}
                      </Text>
                    </View>
                    {row.kind === 'toggle' ? (
                      <View style={styles.toggle}>
                        <Toggle
                          value={values[row.key]}
                          onChange={(next) => onToggle(row.key, next)}
                          accessibilityLabel={row.title}
                        />
                      </View>
                    ) : (
                      <Image
                        source={Icons.chevronLeft}
                        style={styles.chevron}
                        contentFit="contain"
                      />
                    )}
                  </Pressable>
                </Fragment>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() =>
            confirm({
              title: '로그아웃할까요?',
              okText: '로그아웃',
              destructive: true,
              onOk: async () => {
                await signOut();
                router.replace('/login');
              },
            })
          }
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 29,
    paddingTop: 21,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 60,
    gap: 17,
  },
  section: { gap: 7 },
  sectionTitle: {
    marginLeft: -3,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    color: '#808B9F',
  },
  card: { borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8.7,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  row: {
    height: 53.3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 8.4,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  texts: { flex: 1, gap: 5 },
  rowTitle: { fontFamily: Fonts.medium, fontSize: 13.3, color: '#EBECEE' },
  rowDesc: { fontFamily: Fonts.regular, fontSize: 10.7, color: '#91969D' },
  toggle: { marginRight: 16.6 },
  logout: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  logoutText: { fontFamily: Fonts.medium, fontSize: 13, color: '#91969D' },
  // 피그마 chevron.left 를 좌우 반전 → ›
  chevron: { width: 6.5, height: 10.6, marginRight: 1, transform: [{ scaleX: -1 }] },
});
