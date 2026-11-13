import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import NeuButton from '@/components/NeuButton';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { mockMe } from '@/mocks/me';

const PRICE = 500; // 무가사 음악 생성 1회
const MAX = 99;
const ORB_VISIBLE = 115;

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

// 햄버거 > 결제 = 음악 충전 (피그마 '결제')
// - 음악 생성 기회를 횟수 단위로 충전 (자동 결제 없음)
export default function PaymentScreen() {
  const [count, setCount] = useState(1);
  const emotion = getEmotion(mockMe.emotion);

  const pay = () => {
    // TODO: 결제(PG) 연동 → 성공 시 크레딧 충전 API
    Alert.alert('음악 충전', `${count}회 · ${won(PRICE * count)} 결제는 연동 후 동작해요.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="음악 충전" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>음악 생성 기회 충전하기</Text>
        <Text style={styles.desc}>감정 구슬에 담을 나만의 무가사 음악을 만들어 보세요.</Text>

        <View style={styles.orb}>
          <Image
            source={emotion.image}
            style={orbImageStyle(emotion.key, ORB_VISIBLE)}
            contentFit="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.kind}>무가사 음악 생성</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{won(PRICE)}</Text>
            <Text style={styles.per}>/ 1회</Text>
          </View>
          <Text style={styles.benefit}>음악 생성 1회 + 완성된 감정 구슬에 음악 넣기</Text>

          <View style={styles.divider} />

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>충전 수량</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setCount((c) => Math.max(1, c - 1))}
                disabled={count <= 1}
                hitSlop={8}
                accessibilityLabel="수량 줄이기"
                style={styles.stepBtn}
              >
                <Text style={[styles.stepSign, count <= 1 && styles.stepDisabled]}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{count}회</Text>
              <Pressable
                onPress={() => setCount((c) => Math.min(MAX, c + 1))}
                disabled={count >= MAX}
                hitSlop={8}
                accessibilityLabel="수량 늘리기"
                style={styles.stepBtn}
              >
                <Text style={[styles.stepSign, count >= MAX && styles.stepDisabled]}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.qtyLabel}>결제 금액</Text>
            <Text style={styles.total}>{won(PRICE * count)}</Text>
          </View>
        </View>

        <Text style={styles.note}>자동 결제 없이 필요한 횟수만큼 충전할 수 있어요.</Text>

        <NeuButton
          label={`${won(PRICE * count)} 결제하기`}
          onPress={pay}
          style={styles.payButton}
        />

        <Text style={styles.policy}>
          결제 후 음악 생성이 시작되며, 생성 중에도 감정 구슬은 먼저 전송돼요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    alignItems: 'center',
    paddingHorizontal: 27,
    paddingTop: 21,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 40,
  },
  title: { fontFamily: Fonts.semiBold, fontSize: 19, lineHeight: 23, color: Colors.textPrimary },
  desc: {
    marginTop: 4,
    fontFamily: Fonts.regular,
    fontSize: 10.7,
    lineHeight: 16,
    color: '#9EA4AB',
  },
  orb: {
    marginTop: 11,
    width: 134,
    height: 134,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignSelf: 'stretch',
    marginTop: 9,
    minHeight: 203,
    borderRadius: 12,
    borderWidth: 0.7,
    borderColor: '#3B3D40',
    backgroundColor: '#1B1C1E',
    paddingHorizontal: 16.7,
    paddingTop: 15.3,
    paddingBottom: 16,
  },
  kind: { fontFamily: Fonts.medium, fontSize: 10.3, color: '#ABB0B7' },
  priceRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline', gap: 18 },
  price: { fontFamily: Fonts.medium, fontSize: 25.3, color: '#F4F5F6' },
  per: { fontFamily: Fonts.regular, fontSize: 10.7, color: '#9EA4AB' },
  benefit: { marginTop: 8, fontFamily: Fonts.regular, fontSize: 9, color: '#CFD2D5' },
  divider: { marginTop: 13, height: 0.7, backgroundColor: '#3B3D40' },
  qtyRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyLabel: { fontFamily: Fonts.medium, fontSize: 10, color: '#E0E2E4' },
  stepper: {
    width: 95,
    height: 26,
    borderRadius: 13,
    borderWidth: 0.7,
    borderColor: '#4A4D52',
    backgroundColor: '#1F2021',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: { width: 26, alignItems: 'center' },
  stepSign: { fontFamily: Fonts.medium, fontSize: 11.3, color: '#B8BDC2' },
  stepDisabled: { color: '#4A4D52' },
  qty: { fontFamily: Fonts.medium, fontSize: 10, color: '#F0F1F3' },
  totalRow: {
    marginTop: 'auto',
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textPrimary },
  note: {
    marginTop: 9,
    fontFamily: Fonts.regular,
    fontSize: 10,
    lineHeight: 15,
    color: '#9EA4AB',
  },
  payButton: { alignSelf: 'stretch', marginTop: 18, height: 44 },
  policy: {
    marginTop: 18,
    fontFamily: Fonts.regular,
    fontSize: 9,
    lineHeight: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
