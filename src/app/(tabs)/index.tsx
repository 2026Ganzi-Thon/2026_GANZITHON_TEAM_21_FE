import { useFocusEffect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { records } from '@/api/emori';
import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import CareCard, { useCareCard } from '@/components/CareCard';
import PageDots from '@/components/PageDots';
import RecordSheet from '@/components/RecordSheet';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import ViewMenu from '@/components/ViewMenu';
import { MineOrbs } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { getEmotion } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { useApi } from '@/hooks/useApi';
import { mockViews, mockWeekLabel } from '@/mocks/home';
import { setViewIndex, useViewIndex } from '@/stores/viewStore';

// 01 메인 (피그마 '메인' / '내 메인')
// - 0번 = 내 감정, 1번 = 전체 감정(메인 오브제). 제목 ⌄ 메뉴, 페이지 점, 좌우 스와이프로 전환
// - 그룹 화면은 PRD v1.4에서 후속 기능이라 뺌
// - 구슬 누르면 이번 주 상세 기록
export default function HomeScreen() {
  const careCard = useCareCard();
  const index = useViewIndex();
  const base = mockViews[index];
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // GET /records (내 감정 = 내가 만든 것만, 전체 = 보낸 + 받은). 탭에 돌아올 때마다 새로
  const book = useApi(() => records(base.kind), [base.kind]);
  useFocusEffect(book.reload);
  const thisWeek = book.data?.weeks[book.data.thisWeekIndex] ?? null;
  // '내 감정' 구슬 = 이번 주 가장 많이 고른 색 (빨강은 파스텔 구슬이 없어서 분홍)
  const top = book.data?.topThisWeek;
  const mineKey = top ? ((top === 'red' ? 'pink' : top) as keyof typeof MineOrbs) : null;
  const view =
    base.kind === 'mine' && mineKey
      ? {
          ...base,
          orb: MineOrbs[mineKey],
          ring: { ...base.ring, glowColor: getEmotion(mineKey).glow },
        }
      : base;
  // 전체 감정 안내 문구: 가장 최근에 감정을 보낸 사람
  const sender = book.data?.latestSender;
  const message =
    base.kind === 'all'
      ? sender
        ? `${sender}${sender.startsWith('익명') ? '가' : '님이'} 가장 최근에 감정을 보냈어요.`
        : '아직 받은 감정이 없어요.'
      : view.message;

  const go = (next: number) => {
    if (next >= 0 && next < mockViews.length) setViewIndex(next);
  };

  // 구슬 위에서 좌우로 넘기면 이전/다음 화면
  const swipe = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .runOnJS(true)
      .onEnd(() => go(index + 1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => go(index - 1)),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={view.title}
        subtitle={thisWeek?.label ?? mockWeekLabel}
        onPressTitle={() => setMenuOpen(true)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <GestureDetector gesture={swipe}>
          <View collapsable={false}>
            <EmotionOrb
              key={view.key}
              source={view.orb}
              {...view.ring}
              onPress={() => setSheetOpen(true)}
            />
          </View>
        </GestureDetector>

        <View style={styles.dots}>
          <PageDots count={mockViews.length} activeIndex={index} onPressDot={go} />
        </View>

        {/* 최근 무거운 감정이 반복되면 안내 문구 대신 케어 카드 (PRD 6장) */}
        {careCard.stage ? (
          <View style={styles.care}>
            <CareCard stage={careCard.stage} noticeId={careCard.noticeId} />
          </View>
        ) : (
          <>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.hint}>구슬을 눌러 감정 기록을 확인해보세요.</Text>
          </>
        )}
      </ScrollView>

      {/* 구슬 누르면 이번 주 상세 기록 (기능명세 AR-02 / AR-03) */}
      <RecordSheet
        week={sheetOpen ? thisWeek : null}
        mode={view.kind}
        onClose={() => setSheetOpen(false)}
      />

      <ViewMenu
        visible={menuOpen}
        items={mockViews.map((v) => v.title)}
        selectedIndex={index}
        onSelect={go}
        onClose={() => setMenuOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    alignItems: 'center',
    paddingTop: 56, // 링 중심 y = 317 (피그마)
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 40,
  },
  dots: { marginTop: 40, marginBottom: 58 },
  care: { alignSelf: 'stretch', marginTop: -24 },
  message: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  hint: {
    marginTop: 3,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
