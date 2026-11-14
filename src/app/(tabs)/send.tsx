import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import EmotionWheel, { WHEEL_SIZE } from '@/components/EmotionWheel';
import MusicOrb from '@/components/MusicOrb';
import RecipientSheet from '@/components/RecipientSheet';
import { Icons, Sounds } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { useOrbMusic } from '@/hooks/useOrbMusic';
import { notifyReacted } from '@/mocks/notifications';
import { mockRecipients } from '@/mocks/send';
import { spendCredit, useCredits } from '@/stores/creditStore';
import type { EmotionKey, SendRoute } from '@/types/emotion';
import { confirm, notify } from '@/utils/dialog';

const ORB_SIZE = 300;
const ORB_VISIBLE = 272; // 가운데 구슬이 화면에 보이는 지름 (피그마 기준)
const STAGE_HEIGHT = 470;
const CENTER_Y = 224; // 헤더 아래 ~ 휠 중심 (피그마 기준)
const ORB_CENTER_Y = 218; // 가운데 큰 구슬은 휠 중심보다 살짝 위
const MAX_EMOTIONS = 2;
const PANEL_TOP = ORB_CENTER_Y + ORB_SIZE / 2 + 32; // 음악 단계 안내·버튼 시작 위치
const GENERATE_MS = 4000; // 가짜 음악 생성 시간
const PROMPT_MAX = 100;

// 단계
// empty(+) → pick(휠) → ask(음악 넣을지) → prompt(음악 설명) → generating → ready(완성) → share
//                                └ 감정 구슬만 보내기 ─────────────────────────────────→ share
type Step = 'empty' | 'pick' | 'ask' | 'prompt' | 'generating' | 'ready' | 'share' | 'sent';

const CANCEL_MS = 5 * 60 * 1000; // 보낸 뒤 5분 안에만 취소 가능 (PRD 5-4)

// 감정 보내기 (피그마 '감정_보내기' ~ '감정_보내기4', '감정_보내기_음악_크레딧_소지' 1~5)
export default function SendScreen() {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>('empty');
  const [emotions, setEmotions] = useState<EmotionKey[]>([]);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [route, setRoute] = useState<SendRoute>('friends');
  const [prompt, setPrompt] = useState('');
  const [hasMusic, setHasMusic] = useState(false);
  const [sent, setSent] = useState<{ at: number; done: string; labels: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 전송 완료 화면: 취소 가능 시간 1초마다 갱신
  useEffect(() => {
    if (step !== 'sent') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);
  const remaining = sent ? Math.max(0, sent.at + CANCEL_MS - now) : 0;
  const mmss = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  const credits = useCredits();
  // TODO: 연동 시 생성된 음악 URL 로 교체
  const music = useOrbMusic(hasMusic ? Sounds.calm01 : undefined);

  // 음악 생성 진행 막대
  const progress = useSharedValue(0);
  useEffect(() => {
    if (step !== 'generating') return;
    progress.set(0);
    progress.set(withTiming(1, { duration: GENERATE_MS, easing: Easing.out(Easing.quad) }));
    // TODO: 음악 생성 API (prompt, emotions) → 완료되면 ready
    const t = setTimeout(() => {
      setHasMusic(true);
      setStep('ready');
    }, GENERATE_MS);
    return () => clearTimeout(t);
  }, [step, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  // 음악 설명 입력할 때 키보드에 가리지 않게 화면을 올림
  const keyboard = useAnimatedKeyboard();
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.get() - 250) }],
  }));

  const toggleEmotion = (key: EmotionKey) => {
    setEmotions((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // 최대 2개까지 섞기 - 3번째를 고르면 두 번째를 교체
      if (prev.length >= MAX_EMOTIONS) return [prev[0], key];
      return [...prev, key];
    });
  };

  const toggleRecipient = (id: string) =>
    setRecipientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // "감정 선택을 마쳤다면 바깥을 터치" → 음악 넣을지 묻기
  const onPressOutside = () => {
    if (step === 'pick' && emotions.length > 0) setStep('ask');
    if (step === 'prompt') Keyboard.dismiss();
  };

  // 음악 넣기: 크레딧이 있으면 설명 입력, 없으면 충전 화면으로
  const onAddMusic = () => {
    if (credits > 0) return setStep('prompt');
    confirm({
      title: '음악 생성 기회가 없어요',
      message: '충전하고 나만의 음악을 넣어볼까요?',
      okText: '충전하기',
      onOk: () => router.navigate('/payment'),
    });
  };

  const onGenerate = () => {
    Keyboard.dismiss();
    if (!spendCredit()) return onAddMusic();
    setStep('generating');
  };

  const onlyOrb = () => {
    Keyboard.dismiss();
    setHasMusic(false);
    setStep('share');
  };

  const reset = () => {
    music.stop();
    setSent(null);
    setStep('empty');
    setEmotions([]);
    setRecipientIds([]);
    setRoute('friends');
    setPrompt('');
    setHasMusic(false);
  };

  const onSend = () => {
    // TODO: 백엔드 연동 - 감정 전송 API
    // { emotions: ['yellow', 'blue'], route: 'friends' | 'me' | 'anonymous', recipientIds,
    //   music: hasMusic ? { prompt, musicId } : null }
    const labels = emotions.map((k) => getEmotion(k).label).join(' · ');
    const done =
      route === 'me'
        ? '나에게 감정을 보관했어요.'
        : route === 'anonymous'
          ? '익명으로 감정을 보냈어요.'
          : `${recipientIds.length}곳에 감정을 보냈어요.`;
    music.stop();
    const at = Date.now();
    setSent({ at, done, labels: `${labels}${hasMusic ? ' · 음악 포함' : ''}` });
    setNow(at);
    setStep('sent');
    // TODO: 시연용 가짜 반응 알림 (반응은 익명으로 보낸 구슬에만). 연동 시 삭제
    if (route === 'anonymous') demoTimer.current = setTimeout(notifyReacted, 6000);
  };

  // 보내기 취소: 5분 이내 + 상대가 아직 안 열었을 때만 (열었는지는 서버가 판단)
  const onCancelSend = () =>
    confirm({
      title: '보내기를 취소할까요?',
      message: '상대방이 아직 확인하지 않았다면 보낸 감정구슬이 사라져요.',
      okText: '보내기 취소',
      destructive: true,
      onOk: () => {
        // TODO: 전송 취소 API → 이미 열람했으면 실패 응답 → '이미 확인한 구슬이에요' 안내
        if (demoTimer.current) clearTimeout(demoTimer.current);
        reset();
        notify('보내기를 취소했어요.');
      },
    });

  const onDone = () => {
    reset();
    router.navigate('/');
  };

  const [first, second] = emotions;
  const firstEmotion = first ? getEmotion(first) : undefined;

  const isMusicStep =
    step === 'ask' ||
    step === 'prompt' ||
    step === 'generating' ||
    step === 'ready' ||
    step === 'sent';
  const words = emotions.flatMap((k) => getEmotion(k).words).slice(0, 3);

  const message =
    step === 'empty'
      ? ['지금 느끼는 감정을 보내보세요.', '+를 눌러 구슬 색상 추가하기.']
      : emotions.length === 0
        ? ['휠을 돌려 감정을 확인 하세요.', '터치 혹은 구슬을 눌러 선택하기.']
        : // 고른 감정의 이름과 단어를 보여줘서 무슨 감정인지 확인할 수 있게
          [
            emotions.map((k) => getEmotion(k).label).join(' + '),
            emotions.length === 1
              ? `${firstEmotion!.words.join(', ')}\n바깥을 터치하면 보내기, 하나 더 고르면 섞기`
              : '바깥을 터치해서 보내기',
          ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPressOutside} />

      <View style={styles.headerLayer} pointerEvents="box-none">
        <AppHeader title="감정 보내기" />
      </View>

      <Animated.View
        // 음악 단계는 아래 버튼까지 터치되도록 영역을 늘림 (안드로이드는 영역 밖 터치가 안 됨)
        style={[styles.stage, isMusicStep && styles.stageTall, liftStyle]}
        pointerEvents="box-none"
      >
        {step === 'pick' && (
          <View
            style={[
              styles.wheel,
              { left: width / 2 - WHEEL_SIZE / 2, top: CENTER_Y - WHEEL_SIZE / 2 },
            ]}
          >
            <EmotionWheel selected={emotions} onToggle={toggleEmotion} />
          </View>
        )}

        <View
          style={[styles.orb, { left: width / 2 - ORB_SIZE / 2, top: ORB_CENTER_Y - ORB_SIZE / 2 }]}
        >
          <MusicOrb
            size={ORB_SIZE}
            enabled={step === 'ready'}
            playing={music.playing}
            onPlay={music.play}
            onStop={music.stop}
          >
            <EmotionOrb
              size={ORB_SIZE}
              source={firstEmotion?.image}
              overlaySource={second ? getEmotion(second).image : undefined}
              imageStyle={first ? orbImageStyle(first, ORB_VISIBLE) : undefined}
              overlayImageStyle={second ? orbImageStyle(second, ORB_VISIBLE) : undefined}
              ringColor={firstEmotion ? '#1E2633' : '#26282C'}
              glowColor={firstEmotion ? '#8AA8E1' : '#CCD3E0'}
              shadowColor={firstEmotion ? '#1F0F40' : '#34313A'}
              onPress={
                step === 'empty'
                  ? () => setStep('pick')
                  : step === 'ready'
                    ? () => setStep('share') // 완성된 음악 구슬은 터치로 보내기
                    : onPressOutside
              }
            >
              {!firstEmotion && (
                <Image source={Icons.plus} style={styles.plus} contentFit="contain" />
              )}
            </EmotionOrb>
          </MusicOrb>
        </View>

        {/* ── 음악 넣기 단계 (피그마 '감정_보내기_음악_크레딧_소지') ── */}
        {step === 'ask' && (
          <View style={styles.panel}>
            <Text style={styles.message}>나만의 음악을 만들어 넣을 수 있어요.</Text>
            <Pressable
              onPress={onAddMusic}
              style={({ pressed }) => [
                styles.btn,
                styles.btnAccent,
                styles.btnFirst,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnLabel}>음악 넣기</Text>
            </Pressable>
            <Pressable
              onPress={onlyOrb}
              style={({ pressed }) => [styles.btn, styles.btnDark, pressed && styles.pressed]}
            >
              <Text style={styles.btnLabel}>감정 구슬만 보내기</Text>
            </Pressable>
            <Text style={styles.credit}>남은 음악 생성 {credits}회</Text>
          </View>
        )}

        {step === 'prompt' && (
          <View style={styles.panelPrompt}>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={
                '음악으로 만들고 싶은 내 감정이나 상황, 전달을 위한 음악 인지,\n내가 듣기 위한 음악 인지 등을 작성해주세요.\n\nex) 예상치 못한 용돈을 받았어, 친구에게 이 감정을 전하고 싶어.'
              }
              placeholderTextColor="#8A8F98"
              multiline
              maxLength={PROMPT_MAX}
              textAlignVertical="top"
              style={styles.prompt}
            />
            {prompt.trim() ? (
              <Pressable
                onPress={onGenerate}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnFull,
                  styles.btnAccent,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.btnLabel}>음악 생성하기</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onlyOrb}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnFull,
                  styles.btnDark,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.btnLabel}>감정 구슬만 보내기</Text>
              </Pressable>
            )}
          </View>
        )}

        {step === 'generating' && (
          <View style={styles.panel}>
            <Text style={styles.message}>맞춤형 음악을 생성 중 입니다.</Text>
            <View style={styles.track}>
              <Animated.View style={[styles.bar, barStyle]} />
            </View>
          </View>
        )}

        {/* 전송 완료 + 보내기 취소 (기획 답변: 완료 화면에 취소 버튼 + 남은 시간) */}
        {step === 'sent' && sent && (
          <View style={styles.panel}>
            <Text style={styles.message}>{sent.done}</Text>
            <Text style={styles.hint}>{sent.labels}</Text>
            <View style={styles.sentButtons}>
              {route !== 'me' && remaining > 0 && (
                <Pressable
                  onPress={onCancelSend}
                  style={({ pressed }) => [
                    styles.btnHalf,
                    styles.btnDark,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.btnLabel}>보내기 취소</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onDone}
                style={({ pressed }) => [
                  styles.btnHalf,
                  styles.btnAccent,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.btnLabel}>확인</Text>
              </Pressable>
            </View>
            {route !== 'me' && (
              <Text style={styles.credit}>
                {remaining > 0
                  ? `${mmss} 동안 보내기를 취소할 수 있어요`
                  : '취소 가능한 시간이 지났어요'}
              </Text>
            )}
          </View>
        )}

        {step === 'ready' && (
          <View style={styles.panel} pointerEvents="none">
            <Text style={styles.message}>{words.join(', ')}…</Text>
            <Image source={Icons.headphones} style={styles.headphones} contentFit="contain" />
            <Text style={styles.message}>감정과 관련 된 음악을 생성했어요.</Text>
            <Text style={styles.hint}>
              {'시계 방향으로 구슬을 스와이프 해서\n노래 듣기 및 터치로 보내기'}
            </Text>
          </View>
        )}
      </Animated.View>

      {(step === 'empty' || step === 'pick') && (
        <View style={styles.texts} pointerEvents="none">
          <Text style={styles.message}>{message[0]}</Text>
          <Text style={styles.hint}>{message[1]}</Text>
        </View>
      )}

      <RecipientSheet
        visible={step === 'share'}
        route={route}
        onChangeRoute={setRoute}
        recipients={mockRecipients}
        selectedIds={recipientIds}
        onToggle={toggleRecipient}
        onBack={() => setStep(hasMusic ? 'ready' : 'ask')}
        onClose={() => setStep(hasMusic ? 'ready' : 'ask')}
        onSend={onSend}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerLayer: { zIndex: 10, backgroundColor: Colors.background },
  stage: { height: STAGE_HEIGHT, zIndex: 5 },
  stageTall: { height: PANEL_TOP + 230 },
  wheel: { position: 'absolute' },
  orb: { position: 'absolute' },
  plus: { width: 83, height: 83 },
  // 음악 단계
  panel: { position: 'absolute', left: 0, right: 0, top: PANEL_TOP, alignItems: 'center' },
  panelPrompt: { position: 'absolute', left: 34, right: 34, top: PANEL_TOP - 20 },
  btn: {
    alignSelf: 'stretch',
    marginHorizontal: 34,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFull: { marginHorizontal: 0 },
  btnFirst: { marginTop: 22, marginBottom: 13 },
  btnAccent: {
    backgroundColor: '#4F6A7A',
    boxShadow: '0px 0px 16px rgba(110,160,190,0.35), 4px 4px 10px rgba(8,8,8,0.8)',
  },
  btnDark: {
    backgroundColor: '#262626',
    boxShadow:
      'inset -3px 3px 7px rgba(15,15,15,0.2), inset 3px -3px 7px rgba(15,15,15,0.2), inset -3px -3px 7px rgba(61,61,61,0.9), inset 3px 3px 8px rgba(15,15,15,0.9)',
  },
  pressed: { opacity: 0.8 },
  btnLabel: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textActive },
  credit: { marginTop: 12, fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  prompt: {
    height: Platform.OS === 'web' ? 160 : 125, // 웹은 글자가 커서 칸도 키움
    marginBottom: 13,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#2A2A2A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3A3A',
    fontFamily: Fonts.regular,
    fontSize: Platform.OS === 'web' ? 16 : 13, // 웹은 16 미만이면 아이폰에서 확대됨
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  track: {
    marginTop: 22,
    width: 187,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4A5060',
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 3, backgroundColor: Colors.white },
  headphones: { marginTop: 14, marginBottom: 10, width: 22, height: 22 },
  sentButtons: {
    alignSelf: 'stretch',
    marginTop: 22,
    marginHorizontal: 34,
    flexDirection: 'row',
    gap: 12,
  },
  btnHalf: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { alignItems: 'center', marginTop: 8 },
  message: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  hint: {
    marginTop: 3,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
