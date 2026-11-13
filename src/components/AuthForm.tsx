import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DecoOrb from '@/components/DecoOrb';
import { Icons, Images } from '@/constants/assets';
import { Colors, NeuCard } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { signIn } from '@/stores/authStore';
import { notify } from '@/utils/dialog';

type Mode = 'login' | 'signup';

// 로그인 / 회원가입 공용 화면 (피그마 '로그인', '회원가입')
// - 다 채우기 전: 아래 버튼 = 닫기 + "회원가입 하기 / 로그인 하기" 링크
// - 다 채우면: 아래 버튼 = 앱으로 이동 + 개인정보 안내 문구
export default function AuthForm({ mode }: { mode: Mode }) {
  const insets = useSafeAreaInsets();
  const dy = insets.top - 46; // 피그마 상태바(46pt) 기준 → 실제 기기 보정
  const isSignup = mode === 'signup';

  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = isSignup && pw2.length > 0 && pw !== pw2;
  const ready = id.trim() !== '' && pw !== '' && (!isSignup || (pw2 !== '' && !mismatch));

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // TODO: 연동 시 교체
      //   로그인   POST /auth/login  { loginId, password } → accessToken
      //   회원가입 POST /auth/signup { loginId, password } → 가입 후 바로 로그인
      await signIn('mock-token');
      router.replace('/');
    } catch {
      notify(isSignup ? '회원가입에 실패했어요.' : '아이디 또는 비밀번호를 확인해주세요.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (router.canGoBack()) router.back();
  };

  const social = (name: string) => notify(`${name} 로그인`, '간편 로그인은 준비 중이에요.'); // TODO

  return (
    <View style={styles.screen}>
      {/* 배경 장식 구슬 */}
      <DecoOrb source={Images.decoPurple} cx={370} cy={184 + dy} size={136} />
      <DecoOrb source={Images.decoGreen} cx={-78} cy={607 + dy} size={321} rotate={-67.95} />
      <DecoOrb source={Images.decoPink} cx={439} cy={705 + dy} size={418} rotate={45.69} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top, paddingBottom: insets.bottom + 2 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Image source={Images.logo} style={styles.logo} contentFit="contain" />
          <Text style={styles.welcome}>이모리에 오신 것을 환영합니다</Text>

          <View style={[styles.fields, !isSignup && styles.fieldsLogin]}>
            <Field
              label="아이디"
              value={id}
              onChangeText={setId}
              placeholder="아이디를 입력해주세요."
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="next"
            />
            <Field
              label="비밀번호"
              value={pw}
              onChangeText={setPw}
              placeholder="비밀번호를 입력해주세요."
              secureTextEntry
              textContentType={isSignup ? 'newPassword' : 'password'}
              returnKeyType={isSignup ? 'next' : 'done'}
              onSubmitEditing={!isSignup && ready ? submit : undefined}
            />
            {isSignup && (
              <Field
                label="비밀번호 확인"
                value={pw2}
                onChangeText={setPw2}
                placeholder="비밀번호를 입력해주세요."
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="done"
                error={mismatch ? '비밀번호가 일치하지 않아요.' : undefined}
              />
            )}
          </View>

          <View style={styles.socials}>
            <Pressable
              onPress={() => social('네이버')}
              hitSlop={10}
              accessibilityLabel="네이버로 로그인"
            >
              <Image source={Icons.naver} style={styles.naver} contentFit="contain" />
            </Pressable>
            <Pressable
              onPress={() => social('구글')}
              hitSlop={10}
              accessibilityLabel="구글로 로그인"
            >
              <Image source={Icons.google} style={styles.google} contentFit="contain" />
            </Pressable>
            <Pressable
              onPress={() => social('전화번호')}
              hitSlop={10}
              accessibilityLabel="전화번호로 로그인"
            >
              <Image source={Icons.phone} style={styles.phone} contentFit="contain" />
            </Pressable>
          </View>

          <View style={styles.spacer} />

          {ready ? (
            <Text style={styles.privacy}>
              EmOri는 정보를 최소한으로 수집하고{'\n'}사용자 동의에 따라 철저하게 관리합니다.
            </Text>
          ) : (
            <View style={styles.switchBlock}>
              <Text style={styles.switchHint}>
                {isSignup ? '이미 회원이신가요?' : '아직 회원이 아니신가요?'}
              </Text>
              <Pressable
                onPress={() => router.replace(isSignup ? '/login' : '/signup')}
                hitSlop={8}
              >
                <Text style={styles.switchLink}>{isSignup ? '로그인 하기' : '회원가입 하기'}</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={ready ? submit : close}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              ready && styles.buttonReady,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonLabel, ready && styles.buttonLabelReady]}>
              {ready ? '앱으로 이동' : '닫기'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput placeholderTextColor="#404446" style={styles.input} {...input} />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 34 },
  logo: { marginTop: 24, marginLeft: -2, width: 184, height: 97 },
  welcome: {
    marginTop: -6,
    marginLeft: -2.7,
    fontFamily: Fonts.semiBold,
    fontSize: 16.7,
    lineHeight: 22,
    color: Colors.textActive,
  },
  // 회원가입: 첫 라벨 y=217 / 로그인: y=252 (피그마)
  fields: { marginTop: 34, gap: 21 },
  fieldsLogin: { marginTop: 69 },
  field: {},
  label: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 16, color: Colors.white },
  inputBox: {
    ...NeuCard,
    marginTop: 20,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.background,
    justifyContent: 'center',
  },
  input: {
    height: '100%',
    paddingHorizontal: 16,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  error: { marginTop: 6, fontFamily: Fonts.regular, fontSize: 12, color: '#FB7575' },
  socials: {
    marginTop: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 31,
  },
  naver: { width: 27, height: 26 },
  google: { width: 38, height: 38 },
  phone: { width: 30, height: 30 },
  spacer: { flex: 1, minHeight: 40 },
  switchBlock: { alignItems: 'center', marginBottom: 22 },
  switchHint: {
    fontFamily: Fonts.regular,
    fontSize: 13.3,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  switchLink: {
    marginTop: 9,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  privacy: {
    marginBottom: 26,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 19,
    color: '#9A9EA6',
  },
  button: {
    marginHorizontal: -9,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      'inset -3px 3px 7px rgba(15,15,15,0.2), inset 3px -3px 7px rgba(15,15,15,0.2), inset -3px -3px 7px rgba(61,61,61,0.9), inset 3px 3px 8px rgba(15,15,15,0.9)',
  },
  buttonReady: {
    backgroundColor: '#7A7A7A',
    boxShadow: '0px 0px 18px rgba(255,255,255,0.12), 4px 4px 10px rgba(8,8,8,0.8)',
  },
  pressed: { opacity: 0.8 },
  buttonLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textActive },
  buttonLabelReady: { color: '#1E1E1E' },
});
