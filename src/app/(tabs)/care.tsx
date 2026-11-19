import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { useRawCareStage } from '@/components/CareCard';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

// 기획 확정 문구 (11/18, 케어 안내 문구 및 링크). 사전 정의 고정 콘텐츠, AI 생성 문구 없음
const SELF_CARE = {
  title: '최근 마음이 조금 지쳐 있지는 않나요?',
  body: '요즘 반복해서 느끼는 감정이 있다면 잠시 멈춰 자신의 마음을 돌아보는 시간을 가져보세요.',
  tips: [
    '잠깐 산책하거나 편안하게 휴식하기',
    '지금 느끼는 감정을 글로 적어보기',
    '믿을 수 있는 사람에게 마음 나누기',
  ],
  closing: '작은 휴식만으로도 마음을 돌보는 시작이 될 수 있어요.',
};

const SUPPORT = {
  title: '혼자 감당하기 어렵다면, 전문적인 도움을 받아보세요.',
  body: '반복되는 감정으로 일상에 어려움을 느낀다면 전문가와 이야기를 나누어 보는 것도 좋은 방법이에요.',
  line: { name: '정신건강위기상담전화', tel: '1577-0199', desc: '24시간 정신건강 상담' },
  portal: 'https://www.mentalhealth.go.kr/', // 국가정신건강정보포털
};

// 마음 돋보기 (케어 안내 상세)
// 1단계: 자기돌봄 방법 / 2단계: 전문 지원 정보 + 기관 링크
// 홈 카드에서 오면 그 카드 단계, 메뉴에서 오면 지금 조건 단계 (조건 없으면 1단계 내용)
export default function CareScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const current = useRawCareStage();
  const stage = params.stage === '2' || (!params.stage && current === 2) ? 2 : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="마음 돋보기" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {stage === 1 ? (
          <>
            <Text style={styles.lead}>{SELF_CARE.title}</Text>
            <Text style={styles.leadSub}>{SELF_CARE.body}</Text>
            <View style={[styles.card, styles.section]}>
              {SELF_CARE.tips.map((t) => (
                <View key={t} style={styles.item}>
                  <Text style={styles.itemTitle}>• {t}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.closing}>{SELF_CARE.closing}</Text>
          </>
        ) : (
          <>
            <Text style={styles.lead}>{SUPPORT.title}</Text>
            <Text style={styles.leadSub}>{SUPPORT.body}</Text>
            <View style={[styles.card, styles.section]}>
              <Pressable
                onPress={() => Linking.openURL(`tel:${SUPPORT.line.tel}`)}
                accessibilityRole="button"
                accessibilityLabel={`${SUPPORT.line.name} ${SUPPORT.line.tel} 전화하기`}
                style={styles.item}
              >
                <View style={styles.supportRow}>
                  <Text style={styles.itemTitle}>{SUPPORT.line.name}</Text>
                  <Text style={styles.tel}>{SUPPORT.line.tel}</Text>
                </View>
                <Text style={styles.itemBody}>{SUPPORT.line.desc}</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => Linking.openURL(SUPPORT.portal)}
              accessibilityRole="link"
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            >
              <Text style={styles.linkLabel}>기관 정보 확인 (국가정신건강정보포털)</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.note}>
          이 안내는 내가 고른 감정 기록만 보고 알려드려요.{'\n'}
          진단이나 치료를 대신하지 않으며, 설정에서 끌 수 있어요.
        </Text>
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
  },
  lead: { fontFamily: Fonts.semiBold, fontSize: 19, color: Colors.textPrimary },
  leadSub: {
    marginTop: 8,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  section: { marginTop: 24 },
  card: { borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  item: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  itemTitle: { fontFamily: Fonts.medium, fontSize: 13.3, color: '#EBECEE' },
  itemBody: {
    marginTop: 4,
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: '#91969D',
  },
  supportRow: { flexDirection: 'row', justifyContent: 'space-between' },
  closing: {
    marginTop: 16,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  linkButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F6A7A',
  },
  linkLabel: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textActive },
  pressed: { opacity: 0.8 },
  tel: { fontFamily: Fonts.semiBold, fontSize: 13.3, color: Colors.lime400 },
  note: {
    marginTop: 22,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.textMuted,
  },
});
