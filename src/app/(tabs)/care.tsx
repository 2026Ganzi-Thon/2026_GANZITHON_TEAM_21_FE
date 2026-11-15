import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { useCareStage } from '@/components/CareCard';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { getCareStage } from '@/constants/care';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { mockMyDays } from '@/mocks/care';

const TIPS = [
  { title: '천천히 숨 고르기', body: '4초 동안 들이쉬고 6초 동안 내쉬기를 몇 번 반복해보세요.' },
  {
    title: '잠깐 바깥 공기 쐬기',
    body: '가볍게 걷거나 햇볕을 쬐는 것만으로도 기분이 조금 달라질 수 있어요.',
  },
  { title: '좋아하는 소리 듣기', body: '받은 구슬의 음악을 다시 들어보는 것도 좋아요.' },
  {
    title: '마음 나누기',
    body: '믿을 수 있는 사람에게 지금 감정을 구슬로 보내보세요.',
    action: 'send',
  },
] as const;

// TODO: 연동 전에 기획과 최종 문구·연락처 확인
const SUPPORT = [
  { title: '정신건강 상담전화', body: '24시간 전문 상담', tel: '1577-0199' },
  { title: '자살예방 상담전화', body: '마음이 많이 힘들 때 24시간', tel: '109' },
  { title: '가까운 정신건강복지센터', body: '지역 센터에서 무료 상담을 받을 수 있어요' },
  { title: '학교·회사 상담센터', body: '학생상담센터나 회사 상담 프로그램도 이용해보세요' },
];

// 마음 돋보기 (케어 넛지 자세히, PRD 6장)
// 1단계: 자기돌봄 안내가 먼저 / 2단계: 전문 지원 정보가 먼저
export default function CareScreen() {
  // 카드를 닫았어도 이 화면에선 단계가 보이게 직접 계산
  const stage = useCareStage() || getCareStage(mockMyDays);
  const supportFirst = stage === 2;

  const tips = (
    <Section title="나를 돌보는 작은 방법">
      {TIPS.map((t) => (
        <Pressable
          key={t.title}
          disabled={!('action' in t)}
          onPress={() => router.navigate('/send')}
          style={styles.item}
        >
          <Text style={styles.itemTitle}>
            {t.title}
            {'action' in t ? '  ›' : ''}
          </Text>
          <Text style={styles.itemBody}>{t.body}</Text>
        </Pressable>
      ))}
    </Section>
  );

  const support = (
    <Section title="이야기 나눌 수 있는 곳">
      {SUPPORT.map((s) => (
        <Pressable
          key={s.title}
          disabled={!s.tel}
          onPress={() => s.tel && Linking.openURL(`tel:${s.tel}`)}
          style={styles.item}
        >
          <View style={styles.supportRow}>
            <Text style={styles.itemTitle}>{s.title}</Text>
            {s.tel && <Text style={styles.tel}>{s.tel}</Text>}
          </View>
          <Text style={styles.itemBody}>{s.body}</Text>
        </Pressable>
      ))}
    </Section>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="마음 돋보기" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          {supportFirst ? '혼자 견디지 않아도 괜찮아요' : '요즘 마음이 조금 무거웠나 봐요'}
        </Text>
        <Text style={styles.leadSub}>
          최근 {supportFirst ? '2주' : '일주일'} 동안 불안·외로움·지침 같은 감정을 자주 골랐어요.
          {'\n'}
          {supportFirst
            ? '편하게 이야기할 수 있는 곳이 있어요.'
            : '오늘은 나를 조금 더 챙겨주는 건 어떨까요?'}
        </Text>

        {supportFirst ? (
          <>
            {support}
            {tips}
          </>
        ) : (
          <>
            {tips}
            {support}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
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
  sectionTitle: {
    marginBottom: 7,
    marginLeft: -3,
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: '#808B9F',
  },
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
