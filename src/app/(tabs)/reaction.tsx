import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Icons } from '@/constants/assets';
import { Colors, NeuCard } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { mockInbox } from '@/mocks/receive';
import { useOpenedIds } from '@/stores/inboxStore';
import { isResting, useRest } from '@/stores/restStore';
import type { ReceivedEmotion } from '@/types/emotion';

const ORB = 46;

// 반응 탭 = 감정구슬 수신함 (PRD 필수 9번)
// - 새 구슬(아직 안 열어봄) / 지난 구슬로 나눠서 보여줌
// - 누르면 단일 감정구슬 화면: 새 구슬은 최초 수신, 열어봤던 구슬은 재진입(버튼 없음)
// - 알림은 감정 정보를 숨기지만, 앱 안 수신함에서는 구슬을 보여줌
export default function InboxScreen() {
  const opened = useOpenedIds();
  const rest = useRest();
  const inbox = mockInbox; // TODO: 수신함 API (최신순)
  const fresh = inbox.filter((r) => !opened.has(r.id));
  const past = inbox.filter((r) => opened.has(r.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="받은 감정"
        subtitle={fresh.length ? `새 구슬 ${fresh.length}개` : '모두 확인했어요'}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isResting(rest) && (
          <View style={styles.restNote}>
            <Text style={styles.restText}>쉬는 중이에요. 그동안 받은 구슬도 여기에 보관돼요.</Text>
          </View>
        )}

        {fresh.length > 0 && <Text style={styles.section}>새로 받은 구슬</Text>}
        {fresh.map((r) => (
          <Row key={r.id} item={r} isNew />
        ))}

        {past.length > 0 && <Text style={styles.section}>지난 구슬</Text>}
        {past.map((r) => (
          <Row key={r.id} item={r} />
        ))}

        {inbox.length === 0 && <Text style={styles.empty}>아직 받은 감정구슬이 없어요.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ item, isNew = false }: { item: ReceivedEmotion; isNew?: boolean }) {
  const [first, second] = item.emotions;
  const labels = item.emotions.map((k) => getEmotion(k).label).join(' + ');
  return (
    <Pressable
      onPress={() => router.navigate({ pathname: '/received', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${item.senderName}, ${item.sentAtLabel}${isNew ? ', 새 구슬' : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.orb}>
        <Image
          source={getEmotion(first).image}
          style={orbImageStyle(first, ORB)}
          contentFit="contain"
        />
        {second && (
          <View style={[StyleSheet.absoluteFill, styles.orb, styles.overlay]}>
            <Image
              source={getEmotion(second).image}
              style={orbImageStyle(second, ORB)}
              contentFit="contain"
            />
          </View>
        )}
      </View>

      <View style={styles.texts}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.senderName}
          </Text>
          {item.route === 'anonymous' && <Text style={styles.badge}>익명</Text>}
          {item.music && (
            <Image source={Icons.headphones} style={styles.music} contentFit="contain" />
          )}
        </View>
        <Text style={styles.labels} numberOfLines={1}>
          {labels}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.time}>{item.sentAtLabel}</Text>
        {isNew && <View style={styles.dot} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingTop: 12,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 60,
    gap: 14,
  },
  restNote: {
    marginHorizontal: 29,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(131,219,214,0.08)',
  },
  restText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary },
  section: {
    marginTop: 8,
    marginLeft: 35,
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#808B9F',
  },
  row: {
    ...NeuCard,
    marginHorizontal: 20,
    height: 72,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  pressed: { opacity: 0.75 },
  orb: { width: ORB, height: ORB, alignItems: 'center', justifyContent: 'center' },
  overlay: { opacity: 0.55 },
  texts: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 16, color: Colors.white },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  music: { width: 18, height: 18 },
  labels: { fontFamily: Fonts.regular, fontSize: 11.5, color: Colors.textMuted },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.lime400 },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
