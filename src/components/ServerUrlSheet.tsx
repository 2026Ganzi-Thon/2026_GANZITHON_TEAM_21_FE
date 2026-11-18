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

import { API_URL, defaultServerUrl, setServerUrl } from '@/api/client';
import NeuButton from '@/components/NeuButton';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { signOut } from '@/stores/authStore';
import { notify } from '@/utils/dialog';

type Props = { visible: boolean; onClose: () => void };

// 개발·부스용 숨은 메뉴: 서버 주소 바꾸기 (재빌드 없이)
// 터널 주소가 바뀌거나 서버가 죽었을 때 목업으로 바로 전환하려고 만듦
// 다른 서버의 로그인은 못 쓰니까 바꾸면 로그아웃
export default function ServerUrlSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(API_URL ?? '');

  const apply = async (url: string | null, label: string) => {
    await setServerUrl(url);
    onClose();
    await signOut();
    notify('서버를 바꿨어요.', `${label}\n다시 로그인해주세요.`);
  };

  const save = () => {
    const url = value.trim();
    if (!/^https?:\/\/\S+$/.test(url))
      return notify('주소를 확인해주세요.', '예) https://xxxx.trycloudflare.com');
    void apply(url, url);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.title}>서버 주소 (개발용)</Text>
          <Text style={styles.sub}>지금: {API_URL ?? '목업 (서버 없이 가짜 데이터)'}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="https://xxxx.trycloudflare.com"
            placeholderTextColor="#8A8F98"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
            accessibilityLabel="서버 주소"
          />
          <View style={styles.buttons}>
            <NeuButton label="이 주소로 바꾸기" variant="light" onPress={save} />
            <NeuButton
              label="목업으로 (서버 없이)"
              variant="dark"
              onPress={() => void apply('', '목업 모드')}
            />
            <NeuButton
              label={`기본값 (${defaultServerUrl() ?? '목업'})`}
              variant="dark"
              onPress={() => void apply(null, defaultServerUrl() ?? '목업 모드')}
            />
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
    paddingTop: 22,
  },
  title: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary },
  sub: {
    marginTop: 6,
    marginBottom: 14,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0E0E0E',
    fontFamily: Fonts.regular,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: Colors.textPrimary,
  },
  buttons: { gap: 12, marginTop: 18 },
});
