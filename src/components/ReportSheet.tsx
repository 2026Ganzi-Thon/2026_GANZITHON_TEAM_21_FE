import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REPORT_REASONS } from '@/api/emori';
import type { ReportReason } from '@/api/types';
import NeuButton from '@/components/NeuButton';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useDragToClose } from '@/hooks/useDragToClose';

const DETAIL_MAX = 500;

type Props = {
  visible: boolean;
  onSubmit: (reason: ReportReason, detail?: string) => void;
  onClose: () => void;
};

// 익명 구슬 신고 (세부 정책 1-5): 사유 4개 중 하나는 꼭 골라야 함, '기타'만 내용 입력
// 보낸 사람에게는 사유·내용이 안 보임. 차단은 따로 (신고해도 자동 차단 X)
export default function ReportSheet({ visible, onSubmit, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');

  const close = () => {
    onClose();
    setTimeout(() => {
      setReason(null);
      setDetail('');
    }, 300);
  };
  const { drag, sheetStyle, onLayout } = useDragToClose(visible, close);

  const submit = () => {
    if (!reason) return;
    onSubmit(reason, reason === 'OTHER' ? detail : undefined);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <GestureHandlerRootView style={styles.root}>
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="닫기" />
          <Animated.View
            onLayout={onLayout}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, sheetStyle]}
          >
            <GestureDetector gesture={drag}>
              <View style={styles.dragArea} collapsable={false}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>

            <Text style={styles.title}>신고 사유를 골라주세요</Text>
            <Text style={styles.sub}>보낸 사람에게는 알리지 않아요.</Text>

            {REPORT_REASONS.map((r) => {
              const on = r.code === reason;
              return (
                <Pressable
                  key={r.code}
                  onPress={() => setReason(r.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.option, on && styles.optionOn]}
                >
                  <View style={[styles.radio, on && styles.radioOn]} />
                  <Text style={styles.optionText}>{r.label}</Text>
                </Pressable>
              );
            })}

            {reason === 'OTHER' && (
              <TextInput
                value={detail}
                onChangeText={setDetail}
                placeholder="내용을 적어주세요 (선택)"
                placeholderTextColor="#8A8F98"
                multiline
                maxLength={DETAIL_MAX}
                textAlignVertical="top"
                style={styles.input}
              />
            )}

            <View style={styles.buttons}>
              <NeuButton label="신고하기" variant="light" disabled={!reason} onPress={submit} />
              <NeuButton label="닫기" variant="dark" onPress={close} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

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
  title: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary },
  sub: {
    marginTop: 4,
    marginBottom: 16,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#262626',
  },
  optionOn: { backgroundColor: '#33414A' },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.textMuted,
  },
  radioOn: { borderColor: Colors.textActive, backgroundColor: Colors.textActive },
  optionText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textSecondary },
  input: {
    minHeight: 88,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0E0E0E',
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  buttons: { gap: 12, marginTop: 8 },
});
