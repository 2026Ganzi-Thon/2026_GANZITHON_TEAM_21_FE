import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import PageDots from '@/components/PageDots';
import RecordSheet from '@/components/RecordSheet';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { mockHome } from '@/mocks/home';
import { mockWeeks } from '@/mocks/record';

// 01 메인 (그룹의 이번 주 감정 구슬)
export default function HomeScreen() {
  const data = mockHome;
  const [sheetOpen, setSheetOpen] = useState(false);
  const thisWeek = mockWeeks[0]; // TODO: 이번 주 기록 API

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={data.groupName}
        subtitle={data.weekLabel}
        onPressTitle={() => {
          // TODO: 그룹 선택 시트
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <EmotionOrb source={data.orbImage} onPress={() => setSheetOpen(true)} />

        <View style={styles.dots}>
          <PageDots count={data.pageCount} activeIndex={1} />
        </View>

        <Text style={styles.message}>{data.latestSender}님이 가장 최근에 감정을 보냈어요.</Text>
        <Text style={styles.hint}>구슬을 눌러 감정 기록을 확인해보세요.</Text>
      </ScrollView>

      {/* 구슬 누르면 이번 주 상세 기록 (기능명세 AR-02 / AR-03) */}
      <RecordSheet week={sheetOpen ? thisWeek : null} onClose={() => setSheetOpen(false)} />
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
