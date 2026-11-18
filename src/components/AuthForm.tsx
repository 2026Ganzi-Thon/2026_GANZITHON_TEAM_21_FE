import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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
import { toApiError } from '@/api/client';
import { auth, LOGIN_ID_RULE, passwordBytes } from '@/api/emori';
import { birthDateError, formatBirthInput } from '@/utils/birthDate';
import { notify } from '@/utils/dialog';

type Mode = 'login' | 'signup';

// 로그인 / 회원가입 공용 화면 (피그마 '로그인', '회원가입')
// - 다 채우기 전: 아래 버튼 = 닫기 + "회원가입 하기 / 로그인 하기" 링크
// - 다 채우면: 아래 버튼 = 앱으로 이동 + 개인정보 안내 문구
export default function AuthForm({ mode }: { mode: Mode }) {
  const insets = useSafeAreaInsets();
  const dy = insets.top - 46; // 피그마 상태바(46pt) 기준 → 실제 기기 보정
  const isSignup = mode === 'signup';

  // 가입 직후 로그인 화면으로 오면 가입한 아이디를 채워둠
  const { id: presetId } = useLocalSearchParams<{ id?: string }>();
  const [id, setId] = useState(presetId ?? '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [birth, setBirth] = useState(''); // 'YYYY-MM-DD' (가입만)
  const [busy, setBusy] = useState(false);
  const [takenId, setTakenId] = useState<string | null>(null); // 중복 확인에서 이미 쓰는 아이디

  // 가입 규칙 (명세 §3): 아이디 소문자·숫자·밑줄 4~20자 (대문자는 소문자로), 비밀번호 8~72바이트
  const loginId = id.trim().toLowerCase();
  const idError =
    !isSignup || loginId === ''
      ? undefined
      : !LOGIN_ID_RULE.test(loginId)
        ? '영어 소문자·숫자·밑줄(_)로 4~20자 입력해주세요.'
        : takenId === loginId
          ? '이미 사용 중인 아이디예요.'
          : undefined;
  const pwLen = passwordBytes(pw);
  const pwError =
    isSignup && pw !== '' && (pwLen < 8 || pwLen > 72)
      ? pwLen < 8
        ? '비밀번호는 8자 이상이어야 해요.'
        : '비밀번호가 너무 길어요.'
      : undefined;
  const mismatch = isSignup && pw2.length > 0 && pw !== pw2;
  const birthError = isSignup ? birthDateError(birth) : undefined;
  const ready =
    loginId !== '' &&
    pw !== '' &&
    (!isSignup || (pw2 !== '' && !mismatch && !idError && !pwError && birth !== '' && !birthError));

  // 아이디 칸을 벗어나면 중복 확인 (GET /auth/login-id-availability)
  const checkId = () => {
    if (!isSignup || !LOGIN_ID_RULE.test(loginId)) return;
    auth
      .available(loginId)
      .then((ok) => setTakenId(ok ? null : loginId))
      .catch(() => {}); // 확인 실패는 가입할 때 서버가 다시 검사
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 회원가입은 가입만 하고 로그인 화면으로 (아이디는 채워둠), 로그인은 홈으로
      if (isSignup) {
        await auth.signup(loginId, pw, birth); // POST /auth/signup
        notify('가입이 완료됐어요.', '가입한 아이디로 로그인해주세요.');
        router.replace({ pathname: '/login', params: { id: loginId } });
        return;
      }
      await auth.login(loginId, pw); // POST /auth/login
      router.replace('/');
    } catch (e) {
      const err = toApiError(e);
      notify(
        err.status === 409
          ? '이미 사용 중인 아이디예요.' // LOGIN_ID_IN_USE
          : err.status === 401
            ? '아이디 또는 비밀번호를 확인해주세요.'
            : err.status === 422
              ? (err.message ?? '입력한 내용을 확인해주세요.')
              : err.code === 'NETWORK'
                ? err.message
                : isSignup
                  ? '회원가입에 실패했어요.'
                  : '로그인에 실패했어요.',
      );
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
              onBlur={checkId}
              error={idError}
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
              error={pwError}
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
            {/* 생년월일: 익명 기능(만 19세 이상) 확인용, 본인 입력 */}
            {isSignup && (
              <Field
                label="생년월일"
                value={birth}
                onChangeText={(t) => setBirth(formatBirthInput(t))}
                placeholder="8자리 숫자 (예: 20010519)"
                keyboardType="number-pad"
                maxLength={10}
                returnKeyType="done"
                error={birthError}
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

          {/* 처음 실행해서 들어온 경우엔 돌아갈 화면이 없으니 '닫기'를 숨김 (기획 답변) */}
          {(ready || router.canGoBack()) && (
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
          )}
          {!(ready || router.canGoBack()) && <View style={styles.buttonSpace} />}
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
  buttonSpace: { height: 52 },
  buttonLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textActive },
  buttonLabelReady: { color: '#1E1E1E' },
});
