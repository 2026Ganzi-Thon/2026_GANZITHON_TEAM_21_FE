import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import CareCard, { useCareStage } from '@/components/CareCard';
import PageDots from '@/components/PageDots';
import RecordSheet from '@/components/RecordSheet';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import ViewMenu from '@/components/ViewMenu';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { mockViews, mockWeekLabel } from '@/mocks/home';
import { getWeeks } from '@/mocks/record';
import { setViewIndex, useViewIndex } from '@/stores/viewStore';

// 01 메인 (피그마 '메인' / '내 메인')
// - 0번 = 내 감정, 1번~ = 그룹. 제목 ⌄ 메뉴, 페이지 점, 좌우 스와이프로 전환
// - 구슬 누르면 이번 주 상세 기록
export default function HomeScreen() {
  const careStage = useCareStage();
  const index = useViewIndex();
  const view = mockViews[index];
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const thisWeek = getWeeks(view.kind)[0]; // TODO: 이번 주 기록 API

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
        subtitle={mockWeekLabel}
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
        {careStage ? (
          <View style={styles.care}>
            <CareCard stage={careStage} />
          </View>
        ) : (
          <>
            <Text style={styles.message}>{view.message}</Text>
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
    paddingTop: 42,
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
