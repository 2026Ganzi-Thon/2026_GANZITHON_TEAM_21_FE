import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toApiError } from '@/api/client';
import { cancelDispatch, catalog, friends as friendsApi, sendOrb } from '@/api/emori';
import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import EmotionWheel, { WHEEL_SIZE } from '@/components/EmotionWheel';
import MusicOrb from '@/components/MusicOrb';
import RecipientSheet from '@/components/RecipientSheet';
import { Avatars, Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { EMOTIONS, getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { useApi } from '@/hooks/useApi';
import { useOrbMusic } from '@/hooks/useOrbMusic';
import { notifyReacted } from '@/mocks/notifications';
import type { EmotionKey, SendRoute } from '@/types/emotion';
import { confirm, notify } from '@/utils/dialog';

const ORB_SIZE = 306; // 링 지름 300 (메인과 같은 크기)
const ORB_VISIBLE = 258; // 가운데 구슬이 화면에 보이는 지름 (큰 구슬 공통)
const STAGE_HEIGHT = 470;
const CENTER_Y = 224; // 헤더 아래 ~ 휠 중심 (피그마 기준)
const ORB_CENTER_Y = CENTER_Y; // 가운데 큰 구슬 = 휠 중심 (피그마)
const MAX_EMOTIONS = 2;
const PANEL_TOP = 400; // 소리 단계 안내·버튼 시작 위치 (탭바와 안 겹치게 고정)
const SOUND_PANEL_TOP = 300; // 소리 고르기 패널 (구슬을 줄여서 위로)

// 단계
// empty(+) → pick(휠) → ask(소리 넣을지) → sound(제공 소리 고르기) → ready(소리 구슬) → share
//                                └ 감정 구슬만 보내기 ──────────────────────────────→ share
// PRD v1.4: 소리는 서비스가 제공하는 15초 이내 무보컬 사운드 중에서 고름 (AI 생성·크레딧 없음)
type Step = 'empty' | 'pick' | 'ask' | 'sound' | 'ready' | 'share' | 'sent';

const CANCEL_MS = 5 * 60 * 1000; // 보낸 뒤 5분 안에만 취소 가능 (PRD 5-4)

// 감정 보내기 (피그마 '감정_보내기' ~ '감정_보내기4', '감정_보내기_음악_크레딧_소지' 1~5)
export default function SendScreen() {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>('empty');
  const [emotions, setEmotions] = useState<EmotionKey[]>([]);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [route, setRoute] = useState<SendRoute>('friends');
  const [soundId, setSoundId] = useState<string | null>(null);
  const [hasMusic, setHasMusic] = useState(false);
  const [sent, setSent] = useState<{
    until: number; // 이 시각까지 취소 가능 (서버 cancelUntil)
    dispatchId: string | null;
    done: string;
    labels: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 전송 완료 화면: 취소 가능 시간 1초마다 갱신
  useEffect(() => {
    if (step !== 'sent') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);
  const remaining = sent ? Math.max(0, sent.until - now) : 0;
  const mmss = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  // 제공 소리 목록 (GET /catalog/sounds) / 받을 친구 목록 (GET /friends)
  const soundList = useApi(() => catalog.sounds(), []).data ?? [];
  const friendList = useApi(() => friendsApi.list(), []).data ?? [];
  const recipients = friendList.map((f) => ({ id: f.id, name: f.name, avatar: Avatars.a1 }));
  const sound = soundList.find((x) => x.id === soundId);
  const music = useOrbMusic(sound?.source);

  // 소리를 고르면 바로 한 번 들려줌 (고르는 단계에서만. 자동 재생 금지는 받는 사람 화면 기준)
  useEffect(() => {
    if (step !== 'sound' || !soundId) return;
    const t = setTimeout(music.play, 200); // 새 음원을 불러올 시간
    return () => clearTimeout(t);
  }, [step, soundId, music.play]);

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

  // "감정 선택을 마쳤다면 바깥을 터치" → 소리 넣을지 묻기
  const onPressOutside = () => {
    if (step === 'pick' && emotions.length > 0) setStep('ask');
  };

  // 고른 소리를 구슬에 넣기 → 돌려서 들어보고 터치로 보내기
  const onUseSound = () => {
    if (!soundId) return;
    music.stop();
    setHasMusic(true);
    setStep('ready');
  };

  const onlyOrb = () => {
    music.stop();
    setSoundId(null);
    setHasMusic(false);
    setStep('share');
  };

  // 홈 화면 큰 위젯에서 구슬을 누르고 들어오면 (ganzithon21://send?emotion=blue)
  // 그 색을 골라둔 휠 화면에서 시작 → 하나 더 고르면 섞기, 바깥 터치하면 다음 단계
  // (effect 안에서 setState 하지 않고, 렌더 중에 '처음 보는 값'일 때만 상태를 맞춤)
  const { emotion: preset } = useLocalSearchParams<{ emotion?: string }>();
  const [appliedPreset, setAppliedPreset] = useState<string>();
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    const key = EMOTIONS.find((e) => e.key === preset)?.key;
    if (key) {
      setSent(null);
      setRecipientIds([]);
      setRoute('friends');
      setSoundId(null);
      setHasMusic(false);
      setEmotions([key]);
      setStep('pick');
    }
  }
  // 적용한 뒤 주소에서 지워서, 같은 색 구슬을 다시 눌러도 또 적용되게
  useEffect(() => {
    if (preset) router.setParams({ emotion: undefined });
  }, [preset]);

  const reset = () => {
    music.stop();
    setSent(null);
    setStep('empty');
    setEmotions([]);
    setRecipientIds([]);
    setRoute('friends');
    setSoundId(null);
    setHasMusic(false);
  };

  const onSend = async () => {
    if (sending) return;
    if (route === 'friends' && recipientIds.length === 0) return;
    setSending(true);
    try {
      // POST /orbs (색 1~2개 + 소리) → POST /orbs/{id}/dispatches (나에게 / 친구 / 익명)
      const result = await sendOrb({
        emotions,
        soundId: hasMusic ? soundId : null,
        route,
        friendIds: route === 'friends' ? recipientIds : [],
      });
      const labels = emotions.map((k) => getEmotion(k).label).join(' · ');
      const done =
        route === 'me'
          ? '나에게 감정을 보관했어요.'
          : route === 'anonymous'
            ? '익명으로 감정을 보냈어요.'
            : `${recipientIds.length}명에게 감정을 보냈어요.`;
      music.stop();
      const at = Date.now();
      setSent({
        until: result.cancelUntil ?? at + CANCEL_MS,
        dispatchId: result.dispatchId,
        done,
        labels: `${labels}${hasMusic && sound ? ` · ${sound.title}` : ''}`,
      });
      setNow(at);
      setStep('sent');
      // TODO: 시연용 가짜 반응 알림 (목업일 때만). 실제로는 서버 푸시
      if (route === 'anonymous' && result.dispatchId === 'mock') {
        demoTimer.current = setTimeout(notifyReacted, 6000);
      }
    } catch (e) {
      const err = toApiError(e);
      // 명세 §6: NO_MATCH(익명 받을 사람 없음), ANON_SEND_LIMIT(하루 5번), FRIENDSHIP_CHANGED 등
      const msg: Record<string, string> = {
        NO_MATCH: '지금은 익명 구슬을 받을 수 있는 사람이 없어요. 잠시 후 다시 보내주세요.',
        ANON_SEND_LIMIT: '오늘은 익명 구슬을 더 보낼 수 없어요. (하루 5번)',
        FRIENDSHIP_CHANGED: '친구 관계가 바뀌었어요. 받는 사람을 다시 골라주세요.',
        AGE_REQUIRED: '익명 보내기는 만 19세 이상만 쓸 수 있어요.',
        ANONYMOUS_DISABLED: '설정에서 익명 구슬을 켜야 보낼 수 있어요.',
      };
      notify('보내지 못했어요', msg[err.code] ?? err.message);
    } finally {
      setSending(false);
    }
  };

  // 보내기 취소: 5분 이내 + 상대가 아직 안 열었을 때만 (열었는지는 서버가 판단)
  const onCancelSend = () =>
    confirm({
      title: '보내기를 취소할까요?',
      message: '상대방이 아직 확인하지 않았다면 보낸 감정구슬이 사라져요.',
      okText: '보내기 취소',
      destructive: true,
      onOk: async () => {
        try {
          await cancelDispatch(sent?.dispatchId ?? null); // POST /dispatches/{id}/cancel
          if (demoTimer.current) clearTimeout(demoTimer.current);
          reset();
          notify('보내기를 취소했어요.');
        } catch (e) {
          const err = toApiError(e);
          notify(
            '취소할 수 없어요',
            err.code === 'CANCEL_NOT_ALLOWED'
              ? '이미 열람했거나 취소할 수 있는 시간이 지났어요.'
              : err.message,
          );
        }
      },
    });

  const onDone = () => {
    reset();
    router.navigate('/');
  };

  const [first, second] = emotions;
  const firstEmotion = first ? getEmotion(first) : undefined;

  const isMusicStep = step === 'ask' || step === 'sound' || step === 'ready' || step === 'sent';
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

      <View
        // 음악 단계는 아래 버튼까지 터치되도록 영역을 늘림 (안드로이드는 영역 밖 터치가 안 됨)
        style={[styles.stage, isMusicStep && styles.stageTall]}
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
          style={[
            styles.orb,
            { left: width / 2 - ORB_SIZE / 2, top: ORB_CENTER_Y - ORB_SIZE / 2 },
            step === 'sound' && styles.orbSmall,
          ]}
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

        {/* ── 소리 넣기 단계 (피그마 '감정_보내기_음악' 스타일, PRD 기준 제공 소리 고르기) ── */}
        {step === 'ask' && (
          <View style={styles.panel}>
            <Text style={styles.message}>감정에 어울리는 소리를 넣을 수 있어요.</Text>
            <Pressable
              onPress={() => setStep('sound')}
              style={({ pressed }) => [
                styles.btn,
                styles.btnAccent,
                styles.btnFirst,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnLabel}>소리 넣기</Text>
            </Pressable>
            <Pressable
              onPress={onlyOrb}
              style={({ pressed }) => [styles.btn, styles.btnDark, pressed && styles.pressed]}
            >
              <Text style={styles.btnLabel}>감정 구슬만 보내기</Text>
            </Pressable>
          </View>
        )}

        {step === 'sound' && (
          <View style={[styles.panel, styles.panelSound]}>
            <Text style={styles.message}>어떤 소리를 넣을까요?</Text>
            <View style={styles.soundGrid}>
              {soundList.map((x) => {
                const on = x.id === soundId;
                return (
                  <Pressable
                    key={x.id}
                    onPress={() => setSoundId(x.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [
                      styles.soundChip,
                      on ? styles.soundChipOn : styles.btnDark,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.btnLabel}>{x.title}</Text>
                    <Text style={styles.soundSec}>{x.seconds}초</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.sentButtons}>
              <Pressable
                onPress={onlyOrb}
                style={({ pressed }) => [styles.btnHalf, styles.btnDark, pressed && styles.pressed]}
              >
                <Text style={styles.btnLabel}>소리 없이 보내기</Text>
              </Pressable>
              <Pressable
                onPress={onUseSound}
                disabled={!soundId}
                style={({ pressed }) => [
                  styles.btnHalf,
                  styles.btnAccent,
                  !soundId && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.btnLabel}>이 소리 넣기</Text>
              </Pressable>
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
              <Text style={styles.note}>
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
            <Text style={styles.message}>{sound?.title} 소리를 넣었어요.</Text>
            <Text style={styles.hint}>
              {'시계 방향으로 구슬을 스와이프 해서\n노래 듣기 및 터치로 보내기'}
            </Text>
          </View>
        )}
      </View>

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
        recipients={recipients}
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
  // 소리 고르기는 칸이 많아서 구슬을 줄이고 패널을 위로 올림 (탭바에 버튼이 안 가리게)
  orbSmall: { transform: [{ translateY: -ORB_SIZE * 0.17 }, { scale: 0.62 }] },
  panelSound: { top: SOUND_PANEL_TOP },
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
  disabled: { opacity: 0.4 },
  // 소리 고르기: 2×2 칩
  soundGrid: {
    alignSelf: 'stretch',
    marginTop: 14,
    marginHorizontal: 34,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  soundChip: {
    width: '48%',
    flexGrow: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundChipOn: {
    backgroundColor: '#4F6A7A',
    boxShadow: '0px 0px 16px rgba(110,160,190,0.35), 4px 4px 10px rgba(8,8,8,0.8)',
  },
  soundSec: { marginTop: 2, fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  btnLabel: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textActive },
  note: { marginTop: 12, fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
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
  texts: { alignItems: 'center', marginTop: 30 }, // 휠 트랙 아래 (피그마: 문구가 휠과 안 겹침)
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
