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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NeuButton from '@/components/NeuButton';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { birthDateError, formatBirthInput } from '@/utils/birthDate';

type Props = {
  visible: boolean;
  onSubmit: (birthDate: string) => void;
  onClose: () => void;
};

// 생년월일 입력 (기획 결정 11/16)
// 생년월일 없이 가입한 기존 계정이 익명 기능을 처음 켤 때만 뜸. 본인 입력, 별도 인증 없음
export default function BirthDateSheet({ visible, onSubmit, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const error = birthDateError(value);
  const ready = value !== '' && !error;

  const close = () => {
    onClose();
    setTimeout(() => setValue(''), 300);
  };
  const submit = () => {
    if (!ready) return;
    onSubmit(value);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>생년월일을 입력해주세요</Text>
          <Text style={styles.sub}>
            익명 구슬은 만 19세 이상만 주고받을 수 있어요.{'\n'}입력한 생년월일로 나이를 확인해요.
          </Text>
          <TextInput
            value={value}
            onChangeText={(t) => setValue(formatBirthInput(t))}
            placeholder="8자리 숫자 (예: 20010519)"
            placeholderTextColor="#8A8F98"
            keyboardType="number-pad"
            maxLength={10}
            autoFocus
            onSubmitEditing={submit}
            style={styles.input}
            accessibilityLabel="생년월일"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.buttons}>
            <NeuButton label="확인" variant="light" disabled={!ready} onPress={submit} />
            <NeuButton label="취소" variant="dark" onPress={close} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: '#1B1B1B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 9,
    marginBottom: 18,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(235,235,245,0.3)',
  },
  title: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0E0E0E',
    fontFamily: Fonts.medium,
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: Colors.textPrimary,
  },
  error: { marginTop: 8, fontFamily: Fonts.regular, fontSize: 12, color: '#E57373' },
  buttons: { gap: 12, marginTop: 18 },
});
