import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import NeuButton from '@/components/NeuButton';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import Toggle from '@/components/Toggle';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import {
  dateLabel,
  endRest,
  isResting,
  restNow,
  scheduleRest,
  toDateKey,
  useRest,
} from '@/stores/restStore';
import { notify } from '@/utils/dialog';

const MAX_DAYS = 30; // 예약은 최대 30일 뒤까지

const addDays = (d: Date, n: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

// 설정 > 잠시 쉬기 (PRD 5-3)
// - 지금 쉬기: 누르는 즉시 적용, 직접 끌 때까지
// - 기간 예약하기: 시작일 ~ 종료일 동안 쉬기
export default function RestScreen() {
  const rest = useRest();
  const resting = isResting(rest);
  const today = new Date();

  // 예약 날짜는 오늘로부터 며칠 뒤인지로 관리
  const [startIn, setStartIn] = useState(1);
  const [length, setLength] = useState(3); // 시작일 포함 며칠
  const fromDate = toDateKey(addDays(today, startIn));
  const toDate = toDateKey(addDays(today, startIn + length - 1));

  const onToggleNow = (on: boolean) => {
    if (on) restNow();
    else endRest();
  };

  const onSchedule = () => {
    scheduleRest(fromDate, toDate);
    notify('휴식을 예약했어요', `${dateLabel(fromDate)} ~ ${dateLabel(toDate)}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="잠시 쉬기" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 지금 상태 */}
        <View style={[styles.status, resting && styles.statusOn]}>
          <Text style={styles.statusTitle}>
            {resting
              ? '쉬는 중이에요'
              : rest.mode === 'scheduled'
                ? '휴식이 예약돼 있어요'
                : '알림을 받고 있어요'}
          </Text>
          <Text style={styles.statusSub}>
            {rest.mode === 'now'
              ? '직접 끌 때까지 알림이 오지 않아요.'
              : rest.mode === 'scheduled'
                ? `${dateLabel(rest.from)} ~ ${dateLabel(rest.to)}`
                : '쉬고 싶을 땐 잠시 알림을 멈춰보세요.'}
          </Text>
        </View>

        {/* 지금 쉬기 */}
        <Text style={styles.sectionTitle}>지금 쉬기</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.texts}>
              <Text style={styles.rowTitle}>바로 휴식하기</Text>
              <Text style={styles.rowDesc}>누르는 즉시 알림이 멈춰요</Text>
            </View>
            <Toggle
              value={rest.mode === 'now'}
              onChange={onToggleNow}
              accessibilityLabel="바로 휴식하기"
            />
          </View>
        </View>

        {/* 기간 예약하기 */}
        <Text style={styles.sectionTitle}>기간 예약하기</Text>
        <View style={styles.card}>
          <DateRow
            label="시작일"
            value={dateLabel(fromDate)}
            onMinus={() => setStartIn((n) => Math.max(0, n - 1))}
            onPlus={() => setStartIn((n) => Math.min(MAX_DAYS, n + 1))}
            canMinus={startIn > 0}
            canPlus={startIn < MAX_DAYS}
          />
          <View style={styles.divider} />
          <DateRow
            label="종료일"
            value={dateLabel(toDate)}
            onMinus={() => setLength((n) => Math.max(1, n - 1))}
            onPlus={() => setLength((n) => Math.min(MAX_DAYS, n + 1))}
            canMinus={length > 1}
            canPlus={length < MAX_DAYS}
          />
        </View>

        {rest.mode === 'scheduled' ? (
          <NeuButton label="예약 취소하기" variant="dark" onPress={endRest} style={styles.button} />
        ) : (
          <NeuButton
            label={`${length}일 동안 쉬기 예약`}
            variant="light"
            onPress={onSchedule}
            style={styles.button}
          />
        )}

        <Text style={styles.note}>
          쉬는 동안 받은 감정구슬은 사라지지 않고 수신함에 그대로 보관돼요.{'\n'}
          쉬고 있다는 사실은 보낸 사람에게 알리지 않아요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DateRow(props: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  canMinus: boolean;
  canPlus: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{props.label}</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={props.onMinus}
          disabled={!props.canMinus}
          hitSlop={8}
          accessibilityLabel={`${props.label} 하루 앞으로`}
          style={styles.stepBtn}
        >
          <Text style={[styles.sign, !props.canMinus && styles.signOff]}>−</Text>
        </Pressable>
        <Text style={styles.date}>{props.value}</Text>
        <Pressable
          onPress={props.onPlus}
          disabled={!props.canPlus}
          hitSlop={8}
          accessibilityLabel={`${props.label} 하루 뒤로`}
          style={styles.stepBtn}
        >
          <Text style={[styles.sign, !props.canPlus && styles.signOff]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// 설정 화면과 같은 카드 스타일
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 29,
    paddingTop: 21,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 60,
  },
  status: {
    borderRadius: 17,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusOn: { borderColor: Colors.lime400, backgroundColor: 'rgba(131,219,214,0.08)' },
  statusTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary },
  statusSub: { marginTop: 6, fontFamily: Fonts.regular, fontSize: 12, color: '#91969D' },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 7,
    marginLeft: -3,
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: '#808B9F',
  },
  card: { borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8.7,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  row: {
    minHeight: 53.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 16,
  },
  texts: { flex: 1, gap: 5 },
  rowTitle: { fontFamily: Fonts.medium, fontSize: 13.3, color: '#EBECEE' },
  rowDesc: { fontFamily: Fonts.regular, fontSize: 10.7, color: '#91969D' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 28, alignItems: 'center' },
  sign: { fontFamily: Fonts.medium, fontSize: 18, color: '#B8BDC2' },
  signOff: { color: '#4A4D52' },
  date: {
    minWidth: 104,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  button: { marginTop: 20, height: 46 },
  note: {
    marginTop: 18,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.textMuted,
  },
});
