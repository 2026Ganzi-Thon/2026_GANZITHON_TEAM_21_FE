import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import type { RecordEntry, WeekRecord } from '@/types/emotion';

const MAX_REACTIONS = 3; // 이보다 많으면 '+N'
const ORB = 42;

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

  return (
    <Modal visible={!!week} transparent animationType="slide" onRequestClose={onClose}>
      {/* 헤더 영역(위쪽)은 비워 두고, 탭하면 닫기 */}
      <Pressable style={{ height: insets.top + 82 }} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />
        {week && <Text style={styles.week}>{week.label}</Text>}

        <View style={styles.columns}>
          <Text style={[styles.colLabel, styles.colEmotion]}>감정</Text>
          <Text style={[styles.colLabel, styles.colSender]}>
            {mode === 'mine' ? '내 감정 받은이' : '보낸이'}
          </Text>
          <Text style={[styles.colLabel, styles.colReaction]}>반응</Text>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {week?.entries.length === 0 && (
            <Text style={styles.empty}>이 주에는 아직 기록이 없어요.</Text>
          )}
          {week?.entries.map((entry) => {
            const emotion = getEmotion(entry.emotion);
            const extra = entry.reactions.length - MAX_REACTIONS;
            return (
              <Pressable
                key={entry.id}
                style={styles.row}
                onPress={onPressEntry ? () => onPressEntry(entry) : undefined}
                disabled={!onPressEntry}
                accessibilityLabel={`${entry.senderName}, ${emotion.label}`}
              >
                <View style={styles.colEmotion}>
                  <View style={styles.orbBox}>
                    <Image
                      source={emotion.image}
                      style={orbImageStyle(entry.emotion, ORB)}
                      contentFit="contain"
                    />
                  </View>
                </View>
                <View style={[styles.colSender, styles.sender]}>
                  <Text style={styles.name} numberOfLines={1}>
                    {entry.senderName}
                  </Text>
                  {entry.hasMusic && (
                    <Image source={Icons.headphones} style={styles.music} contentFit="contain" />
                  )}
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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  sender: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: Fonts.regular, fontSize: 16, color: Colors.white },
  music: { width: 22, height: 22 },
  reactions: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 26 },
  emojiOverlap: { marginLeft: -12 },
  more: { marginLeft: 2, fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.white },
});
