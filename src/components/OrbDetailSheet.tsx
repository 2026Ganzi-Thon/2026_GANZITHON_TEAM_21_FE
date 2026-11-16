import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NeuButton from '@/components/NeuButton';
import { Colors, NeuCard } from '@/constants/colors';
import { LIST_ORB_VISIBLE, getEmotion, orbImageStyle, orbSource } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { useDragToClose } from '@/hooks/useDragToClose';
import type { EmotionKey } from '@/types/emotion';

type Props = {
  visible: boolean;
  emotions: EmotionKey[]; // 섞은 구슬이면 2개
  words?: string[]; // 고른 단어 (emotions 와 같은 순서). 없으면 그 색의 단어 전체
  senderName: string;
  timeLabel: string;
  hasMusic: boolean;
  reaction?: string | null; // 익명 구슬에 보낸 반응 (없으면 null)
  showReaction: boolean; // 익명 구슬만 반응 줄을 보여줌
  onClose: () => void;
};

// 구슬 하나의 상세 기록 팝업 (PRD v1.4 4-4, 4-5 표: '구슬 짧게 탭 → 감정 및 반응 상세기록 팝업')
// - 감정 정보(색 영역 + 고른 단어)를 구슬마다 따로 보여줌 → 섞은 구슬은 두 감정 모두 (PRD 3-3)
// - 보낸이 / 받은 시각 / 소리 여부 / 반응
export default function OrbDetailSheet({
  visible,
  emotions,
  words,
  senderName,
  timeLabel,
  hasMusic,
  reaction,
  showReaction,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [first] = emotions;
  const { drag, sheetStyle, onLayout } = useDragToClose(visible, onClose);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />

        <Animated.View
          onLayout={onLayout}
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, sheetStyle]}
        >
          {/* 손잡이를 아래로 끌면 닫힘 */}
          <GestureDetector gesture={drag}>
            <View style={styles.dragArea} collapsable={false}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          <View style={styles.head}>
            <View style={styles.socket}>
              <Image
                source={orbSource(emotions)}
                style={orbImageStyle(first, LIST_ORB_VISIBLE)}
                contentFit="contain"
              />
            </View>
            <View style={styles.headText}>
              <Text style={styles.title}>
                {emotions.map((k) => getEmotion(k).label).join(' + ')}
              </Text>
              <Text style={styles.sub}>
                {senderName} · {timeLabel}
              </Text>
            </View>
          </View>

          {/* 감정마다 한 줄: 색 영역 + 고른 단어 */}
          {emotions.map((k, i) => {
            const e = getEmotion(k);
            return (
              <View key={k} style={styles.row}>
                <Text style={styles.rowLabel}>{e.label}</Text>
                <Text style={styles.rowValue}>{words?.[i] ?? e.words.join(', ')}</Text>
              </View>
            );
          })}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>소리</Text>
            <Text style={styles.rowValue}>
              {hasMusic ? '있음 · 구슬을 시계 방향으로 돌려 듣기' : '없음'}
            </Text>
          </View>

          {showReaction && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>내 반응</Text>
              <Text style={styles.rowValue}>{reaction ?? '보내지 않음'}</Text>
            </View>
          )}

          <View style={styles.button}>
            <NeuButton label="닫기" variant="dark" onPress={onClose} />
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const SOCKET = 52;

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1 },
  dragArea: { paddingBottom: 14 },
  sheet: {
    backgroundColor: '#1B1B1B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
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
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  socket: {
    width: SOCKET,
    height: SOCKET,
    borderRadius: SOCKET / 2,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headText: { flex: 1, marginLeft: 14 },
  title: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary },
  sub: { marginTop: 4, fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
  row: {
    ...NeuCard,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  rowLabel: { width: 76, fontFamily: Fonts.medium, fontSize: 13, color: Colors.textMuted },
  rowValue: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary },
  button: { marginTop: 10 },
});
