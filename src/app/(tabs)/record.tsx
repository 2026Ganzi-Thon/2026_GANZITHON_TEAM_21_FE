import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import RecordSheet from '@/components/RecordSheet';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { mockRecordStartLabel, mockWeeks } from '@/mocks/record';
import type { WeekRecord } from '@/types/emotion';

const PER_ROW = 4;
const SOCKET = 66; // 구슬 자리(검은 원)
const ORB_VISIBLE = 60;

// 주차별 기록 (피그마 '주차별_기록', 기능명세 AR-06)
// - 한 주 = 구슬 하나, 4개씩 한 줄 / 구슬 누르면 그 주의 상세 기록 팝업
export default function RecordScreen() {
  const weeks = mockWeeks; // TODO: 감정 기록 API
  const [openWeek, setOpenWeek] = useState<WeekRecord | null>(null);

  const rows: WeekRecord[][] = [];
  for (let i = 0; i < weeks.length; i += PER_ROW) rows.push(weeks.slice(i, i + PER_ROW));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="그룹"
        subtitle="기록장"
        onPressTitle={() => {
          // TODO: 그룹 ↔ 내 감정 전환
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.start}>{mockRecordStartLabel}</Text>

        {rows.map((row, r) => (
          <View key={r} style={styles.rowBlock}>
            {/* 구슬 뒤에 깔리는 볼록한 띠 */}
            <View style={styles.band} />
            <View style={styles.orbRow}>
              {row.map((w) => (
                <Pressable
                  key={w.week}
                  style={styles.cell}
                  onPress={() => setOpenWeek(w)}
                  disabled={!w.emotion}
                  accessibilityLabel={`${w.week}주 감정 기록`}
                >
                  <View style={styles.socket}>
                    {w.emotion && (
                      <Image
                        source={getEmotion(w.emotion).image}
                        style={orbImageStyle(w.emotion, ORB_VISIBLE)}
                        contentFit="contain"
                      />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.labelRow}>
              {row.map((w) => (
                <Text key={w.week} style={styles.weekLabel}>
                  {w.week} 주
                </Text>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <RecordSheet week={openWeek} onClose={() => setOpenWeek(null)} />
    </SafeAreaView>
  );
}

// 위치는 피그마 기준 (가로 393 화면, 구슬 중심 x = 84 / 164 / 244 / 324)
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 22, paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 20 },
  start: {
    marginLeft: 42,
    marginBottom: 14,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rowBlock: { marginBottom: 38 },
  band: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: -40,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#1A1A1A',
    shadowColor: '#080808',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
  },
  orbRow: { height: 94, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  cell: { width: 80, alignItems: 'center' },
  socket: {
    width: SOCKET,
    height: SOCKET,
    borderRadius: SOCKET / 2,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  labelRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  weekLabel: {
    width: 80,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
