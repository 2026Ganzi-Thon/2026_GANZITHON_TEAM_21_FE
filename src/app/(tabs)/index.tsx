import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import PageDots from '@/components/PageDots';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { mockHome } from '@/mocks/home';

// 01 메인 (그룹의 이번 주 감정 구슬)
export default function HomeScreen() {
  const data = mockHome;

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
        <EmotionOrb
          source={data.orbImage}
          onPress={() => {
            // TODO: 주간 감정 기록(상세기록-그룹) 열기
          }}
        />

        <View style={styles.dots}>
          <PageDots count={data.pageCount} activeIndex={1} />
        </View>

        <Text style={styles.message}>{data.latestSender}님이 가장 최근에 감정을 보냈어요.</Text>
        <Text style={styles.hint}>구슬을 눌러 감정 기록을 확인해보세요.</Text>
      </ScrollView>
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
