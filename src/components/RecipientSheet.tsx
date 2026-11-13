import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import type { Recipient } from '@/types/emotion';

type Props = {
  visible: boolean;
  recipients: Recipient[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onBack: () => void; // ‹ 뒤로 가기 → 감정 다시 고르기
  onClose: () => void; // ×
  onSend: () => void;
};

// 공유자 선택 하단 시트 (피그마 '감정_보내기3/4')
export default function RecipientSheet({
  visible,
  recipients,
  selectedIds,
  onToggle,
  onBack,
  onClose,
  onSend,
}: Props) {
  const insets = useSafeAreaInsets();
  const count = selectedIds.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* 시트 바깥(위쪽) 탭하면 닫기 */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.handle} />

        <View style={styles.titleRow}>
          <Pressable style={styles.back} onPress={onBack} hitSlop={8}>
            <Image source={Icons.back} style={styles.backIcon} contentFit="contain" />
            <Text style={styles.backText}>뒤로 가기</Text>
          </Pressable>
          <Text style={styles.title}>공유자 선택</Text>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
            <Image source={Icons.close} style={styles.closeIcon} contentFit="contain" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {recipients.map((r) => {
            const on = selectedIds.includes(r.id);
            return (
              <Pressable
                key={r.id}
                onPress={() => onToggle(r.id)}
                style={styles.row}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Image source={r.avatar} style={styles.avatar} contentFit="cover" />
                <Text style={styles.name}>{r.name}</Text>
                <Image
                  source={on ? Icons.radioOn : Icons.radioOff}
                  style={styles.radio}
                  contentFit="contain"
                />
              </Pressable>
            );
          })}
        </ScrollView>

        {count > 0 && (
          <Pressable style={styles.sendButton} onPress={onSend}>
            <Text style={styles.sendText}>{count} 곳에 보내기</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    height: 392,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
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
  titleRow: {
    height: 30,
    marginTop: 7,
    marginHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  backIcon: { width: 13, height: 17 },
  backText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  title: { fontFamily: Fonts.medium, fontSize: 17, color: Colors.white },
  close: { position: 'absolute', right: 0, width: 30, height: 30 },
  // close.svg 에 그림자 여백이 포함돼 있어서 버튼보다 크게 그림
  closeIcon: { position: 'absolute', left: -15, top: -15, width: 62, height: 62 },
  list: { paddingTop: 11, paddingHorizontal: 19, paddingBottom: 90, gap: 13 },
  row: {
    height: 64,
    borderRadius: 17,
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 14,
    shadowColor: '#0C0C0C',
    shadowOffset: { width: 7, height: 7 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: { width: 37, height: 37, borderRadius: 19 },
  name: { flex: 1, marginLeft: 20, fontFamily: Fonts.regular, fontSize: 16, color: Colors.white },
  radio: { width: 24, height: 24 },
  sendButton: {
    position: 'absolute',
    left: 20,
    right: 19,
    top: 306,
    height: 55,
    borderRadius: 16,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F0F0F',
    shadowOffset: { width: 7, height: 7 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 8,
  },
  sendText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textActive },
});
