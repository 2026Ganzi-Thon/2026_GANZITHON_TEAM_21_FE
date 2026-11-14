import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { confirm } from '@/utils/dialog';
import type { RecordEntry, WeekRecord } from '@/types/emotion';

const MAX_REACTIONS = 3; // 이보다 많으면 '+N'
const ORB = 42;

// 끌어내려 닫기 감도
const DISMISS_RATIO = 0.25; // 시트 높이의 25% 이상 내리면 닫힘
const DISMISS_VELOCITY = 700; // 또는 이 속도(px/s) 이상으로 휙 내리면 닫힘
const SPRING_BACK = { damping: 24, stiffness: 280, mass: 0.9 }; // 덜 내렸을 때 제자리로

type Props = {
  week: WeekRecord | null; // null 이면 닫힘
  mode?: 'group' | 'mine'; // mine = 내가 보낸 감정 (두 번째 칸이 '내 감정 받은이')
  onClose: () => void;
  onPressEntry?: (entry: RecordEntry) => void; // 과거 수신 기록 재진입 (기능명세 AR-04)
};

// 상세 기록 팝업 (피그마 '상세기록-그룹')
// - 그 주에 모인 감정: 감정 구슬 / 보낸이(+음악 표시) / 받은 반응
// - 팝업에서는 음악 재생 안 함 (기능명세 MU-10)
export default function RecordSheet({ week, mode = 'group', onClose, onPressEntry }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const visible = !!week;

  // 내가 보낸 기록 삭제 (PRD 5-4: 내 기록에서만 지우고 받은 사람 기록은 유지)
  const [deleted, setDeleted] = useState<string[]>([]);
  const isMine = (entry: RecordEntry) => mode === 'mine' || entry.senderName === '나(본인)';
  const askDelete = (entry: RecordEntry) =>
    confirm({
      title: '내 기록에서 삭제할까요?',
      message: '받은 사람의 기록은 그대로 남아요.',
      okText: '삭제',
      destructive: true,
      onOk: () => setDeleted((prev) => [...prev, entry.id]), // TODO: 발신 기록 삭제 API
    });
  const entries = week?.entries.filter((e) => !deleted.includes(e.id)) ?? [];

  const openReceived = (entry: RecordEntry) => {
    if (!entry.receivedId) return;
    onClose();
    router.navigate({ pathname: '/received', params: { id: entry.receivedId, replay: '1' } });
  };

  // 시트가 원래 자리에서 아래로 밀려난 거리 (0 = 다 열림)
  const offset = useSharedValue(screenH);
  const sheetH = useSharedValue(screenH);

  // 열릴 때: 아래에서 올라옴
  useEffect(() => {
    if (!visible) return;
    offset.set(screenH);
    offset.set(withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [visible, screenH, offset]);

  // 닫힐 때: 아래로 내려간 뒤 onClose
  const close = (velocity = 0) => {
    'worklet';
    const remaining = sheetH.get() - offset.get();
    const speed = Math.max(velocity, 1600); // 손을 빨리 뗐으면 그 속도 그대로 이어서
    const duration = Math.min(280, Math.max(120, (remaining / speed) * 1000));
    offset.set(
      withTiming(sheetH.get(), { duration, easing: Easing.out(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(onClose);
      }),
    );
  };

  // 위쪽 바(손잡이·날짜·열 이름)를 잡고 끌기
  const drag = Gesture.Pan()
    .onUpdate((e) => {
      // 아래로는 손가락 그대로, 위로는 살짝만 (고무줄 느낌)
      offset.set(e.translationY > 0 ? e.translationY : e.translationY * 0.15);
    })
    .onEnd((e) => {
      const far = offset.get() > sheetH.get() * DISMISS_RATIO;
      const fast = e.velocityY > DISMISS_VELOCITY;
      if ((far || fast) && e.velocityY > -300) close(e.velocityY);
      else offset.set(withSpring(0, { ...SPRING_BACK, velocity: e.velocityY }));
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
  }));
  // 시트를 내릴수록 뒤 어둡기도 옅어짐
  const dimStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, offset.get() / Math.max(1, sheetH.get())),
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />
        {/* 헤더 영역(위쪽)은 비워 두고, 탭하면 닫기 */}
        <Pressable style={{ height: insets.top + 82 }} onPress={() => close()} />

        <Animated.View
          style={[styles.sheet, sheetStyle]}
          onLayout={(e) => sheetH.set(e.nativeEvent.layout.height)}
        >
          <GestureDetector gesture={drag}>
            <View style={styles.dragArea} collapsable={false}>
              <View style={styles.handle} />
              {week && <Text style={styles.week}>{week.label}</Text>}

              <View style={styles.columns}>
                <Text style={[styles.colLabel, styles.colEmotion]}>감정</Text>
                <Text style={[styles.colLabel, styles.colSender]}>
                  {mode === 'mine' ? '내 감정 받은이' : '보낸이'}
                </Text>
                <Text style={[styles.colLabel, styles.colReaction]}>반응</Text>
              </View>
            </View>
          </GestureDetector>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {entries.length === 0 && (
              <Text style={styles.empty}>이 주에는 아직 기록이 없어요.</Text>
            )}
            {entries.map((entry) => {
              const [first, second] = entry.emotions;
              const labels = entry.emotions.map((k) => getEmotion(k).label).join(' + ');
              const extra = entry.reactions.length - MAX_REACTIONS;
              // 받은 구슬은 눌러서 그때 수신 화면으로 재진입 (PRD 4-4)
              const canOpen = !!entry.receivedId || !!onPressEntry;
              return (
                <Pressable
                  key={entry.id}
                  style={({ pressed }) => [styles.row, pressed && canOpen && styles.rowPressed]}
                  onPress={() => (onPressEntry ? onPressEntry(entry) : openReceived(entry))}
                  onLongPress={isMine(entry) ? () => askDelete(entry) : undefined}
                  disabled={!canOpen && !isMine(entry)}
                  accessibilityLabel={`${entry.senderName}, ${labels}`}
                >
                  <View style={styles.colEmotion}>
                    <View style={styles.orbBox}>
                      <Image
                        source={getEmotion(first).image}
                        style={orbImageStyle(first, ORB)}
                        contentFit="contain"
                      />
                      {/* 섞은 구슬: 두 번째 감정을 반투명으로 겹침 (보내기 화면과 같은 방식) */}
                      {second && (
                        <View style={[StyleSheet.absoluteFill, styles.orbBox, styles.overlay]}>
                          <Image
                            source={getEmotion(second).image}
                            style={orbImageStyle(second, ORB)}
                            contentFit="contain"
                          />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.colSender}>
                    <View style={styles.sender}>
                      <Text style={styles.name} numberOfLines={1}>
                        {entry.senderName}
                      </Text>
                      {entry.hasMusic && (
                        <Image
                          source={Icons.headphones}
                          style={styles.music}
                          contentFit="contain"
                        />
                      )}
                    </View>
                    {/* 감정 이름 (섞은 구슬이면 두 감정 모두, PRD 4-4) */}
                    <Text style={styles.labels} numberOfLines={1}>
                      {labels}
                    </Text>
                  </View>
                  <View style={[styles.colReaction, styles.reactions]}>
                    {entry.reactions.slice(0, MAX_REACTIONS).map((r, i) => (
                      <Text key={i} style={[styles.emoji, i > 0 && styles.emojiOverlap]}>
                        {r}
                      </Text>
                    ))}
                    {extra > 0 && <Text style={styles.more}>+{extra}</Text>}
                  </View>
                </Pressable>
              );
            })}
            {entries.some(isMine) && (
              <Text style={styles.deleteHint}>내가 보낸 기록은 길게 눌러 삭제할 수 있어요.</Text>
            )}
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { backgroundColor: 'rgba(0,0,0,0.25)' },
  // 손가락이 닿는 영역 (손잡이 바만 잡기엔 작아서 날짜·열 이름까지 포함)
  dragArea: { paddingBottom: 6 },
  sheet: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 9,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(235,235,245,0.3)',
  },
  week: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  columns: { flexDirection: 'row', marginTop: 18, paddingHorizontal: 24 },
  colLabel: { fontFamily: Fonts.regular, fontSize: 12, color: '#808B9F' },
  colEmotion: { width: 56 },
  colSender: { flex: 1 },
  colReaction: { width: 90 },
  list: { paddingTop: 12, paddingBottom: 60, gap: 22 },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#202020',
    shadowColor: '#0C0C0C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  orbBox: { width: ORB, height: ORB, alignItems: 'center', justifyContent: 'center' },
  overlay: { opacity: 0.55 },
  deleteHint: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  rowPressed: { opacity: 0.7 },
  labels: {
    marginTop: 2,
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  sender: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: Fonts.regular, fontSize: 16, color: Colors.white },
  music: { width: 22, height: 22 },
  reactions: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 26 },
  emojiOverlap: { marginLeft: -12 },
  more: { marginLeft: 2, fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.white },
});
