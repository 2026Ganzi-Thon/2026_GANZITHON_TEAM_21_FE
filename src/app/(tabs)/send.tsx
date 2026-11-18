import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey, toApiError } from '@/api/client';
import {
  cancelSent,
  catalogSounds,
  createOrb,
  dispatchOrb,
  friends as friendsApi,
} from '@/api/emori';
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
const PANEL_TOP = 400; // 음악 단계 안내·버튼 시작 위치 (탭바와 안 겹치게 고정)
const SMALL_PANEL_TOP = 300; // 음악 고르기 패널 (구슬을 줄여서 위로)
const CANCEL_MS = 5 * 60 * 1000; // 보낸 뒤 5분 안에만 취소 가능 (세부 정책 2-1)

// 단계 (기획 결정 11/16: 단어는 따로 고르지 않음, 음악은 미리 만든 15초 샘플)
// empty(+) → pick(휠, 1~2색) → ask(음악 넣을지) → sound(샘플 고르기·미리듣기) → ready(돌려서 듣기)
//   └ 감정 구슬만 보내기 ─────────────────────────────────────────────→ share → sent(5분 취소)
type Step = 'empty' | 'pick' | 'ask' | 'sound' | 'ready' | 'share' | 'sent';

const nowMs = () => Date.now();

type Sent = {
  until: number; // 이 시각까지 취소 가능 (서버 cancelUntil)
  dispatchId: string | null;
  done: string;
  labels: string;
};

// 감정 보내기 (피그마 '감정_보내기' ~ '감정_보내기4', '감정_보내기_음악' 1~5)
export default function SendScreen() {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>('empty');
  const [emotions, setEmotions] = useState<EmotionKey[]>([]);
  const [soundId, setSoundId] = useState<string | null>(null);
  const [hasMusic, setHasMusic] = useState(false);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [route, setRoute] = useState<SendRoute>('friends');
  const [sent, setSent] = useState<Sent | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 재시도 키 (명세 §1): 같은 동작을 다시 보낼 때(네트워크 오류 후 다시 누름)는 같은 키,
  // 성공하거나 처음부터 다시 하면 새 키
  const keys = useRef(new Map<string, string>());
  const keyFor = (name: string) => {
    if (!keys.current.has(name)) keys.current.set(name, newIdempotencyKey());
    return keys.current.get(name)!;
  };

  // 전송 완료 화면: 취소 가능 시간 1초마다 갱신
  useEffect(() => {
    if (step !== 'sent') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);
  const remaining = sent ? Math.max(0, sent.until - now) : 0;
  const mmss = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;

  // 받을 친구 목록 (GET /friends)
  const friendList = useApi(() => friendsApi.list(), []).data ?? [];
  const recipients = friendList.map((f) => ({ id: f.id, name: f.name, avatar: Avatars.a1 }));

  // 샘플 음악 목록 (GET /catalog/sounds). 고른 색과 어울리는 음악을 앞에
  const allSounds = useApi(() => catalogSounds.list(), []).data ?? [];
  const sounds = [...allSounds].sort(
    (a, b) =>
      Number(!!b.color && emotions.includes(b.color)) -
      Number(!!a.color && emotions.includes(a.color)),
  );
  const sound = allSounds.find((x) => x.id === soundId);
  const music = useOrbMusic(sound ? [sound.source] : undefined);

  // 음악을 고르면 바로 미리듣기
  useEffect(() => {
    if (step === 'sound' && soundId) music.play();
  }, [step, soundId, music.play]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEmotion = (key: EmotionKey) => {
    setEmotions((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // 최대 2개까지 섞기 (서로 다른 색) - 3번째를 고르면 두 번째를 교체
      if (prev.length >= MAX_EMOTIONS) return [prev[0], key];
      return [...prev, key];
    });
  };

  // 친구에게는 한 번에 한 명 (세부 정책 2-2) → 다른 친구를 누르면 바뀜
  const toggleRecipient = (id: string) => setRecipientId((prev) => (prev === id ? null : id));

  // "감정 선택을 마쳤다면 구슬을 터치" → 음악 넣을지 묻기 (11/18: 바깥 터치 → 가운데 구슬 터치로)
  const onPressOrb = () => {
    if (step === 'pick' && emotions.length > 0) setStep('ask');
  };

  // 고른 음악 넣기 → 구슬을 돌려서 들어보고 터치로 보내기
  const onUseSound = () => {
    if (!soundId) return;
    music.stop();
    setHasMusic(true);
    setStep('ready');
  };

  // 음악 없이 감정 구슬만
  const onlyOrb = () => {
    music.stop();
    setHasMusic(false);
    setSoundId(null);
    setStep('share');
  };

  // 홈 화면 큰 위젯에서 구슬을 누르고 들어오면 (ganzithon21://send?emotion=blue)
  // 그 색을 골라둔 휠 화면에서 시작 → 하나 더 고르면 섞기, 가운데 구슬 터치하면 다음
  // (effect 안에서 setState 하지 않고, 렌더 중에 '처음 보는 값'일 때만 상태를 맞춤)
  const { emotion: preset } = useLocalSearchParams<{ emotion?: string }>();
  const [appliedPreset, setAppliedPreset] = useState<string>();
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    const key = EMOTIONS.find((e) => e.key === preset)?.key;
    if (key) {
      setSent(null);
      setRecipientId(null);
      setRoute('friends');
      setHasMusic(false);
      setSoundId(null);
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
    keys.current.clear();
    setSent(null);
    setStep('empty');
    setEmotions([]);
    setSoundId(null);
    setRecipientId(null);
    setRoute('friends');
    setHasMusic(false);
  };

  const onSend = async () => {
    if (busy) return;
    if (route === 'friends' && !recipientId) return;
    setBusy(true);
    try {
      const attach = hasMusic ? soundId : null;
      // 초안 구슬 (POST /orbs {colors, soundId}) → 보내기 (POST /orbs/{id}/dispatches)
      const orbId = await createOrb(
        emotions,
        attach,
        keyFor(`orb:${emotions.join('+')}:${attach}`),
      );
      const friendId = route === 'friends' ? recipientId : null;
      const result = await dispatchOrb(
        orbId,
        route,
        friendId,
        keyFor(`dispatch:${orbId}:${route}:${friendId}`),
      );
      keys.current.clear();
      const name = recipients.find((r) => r.id === recipientId)?.name ?? '친구';
      const done =
        route === 'me'
          ? '나에게 감정을 보관했어요.'
          : route === 'anonymous'
            ? `익명의 ${result.recipientCount}명에게 감정을 보냈어요.`
            : `${name}에게 감정을 보냈어요.`;
      music.stop();
      const at = nowMs();
      const labels = emotions.map((k) => getEmotion(k).label).join(' + ');
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
      // 명세 §7 오류 코드
      const msg: Record<string, string> = {
        NO_MATCH: '지금은 익명 구슬을 받을 수 있는 사람이 없어요. 잠시 후 다시 보내주세요.',
        ANON_SEND_LIMIT: '오늘은 익명 구슬을 더 보낼 수 없어요. (하루 5번)',
        FRIENDSHIP_CHANGED: '친구 관계가 바뀌었어요. 받는 사람을 다시 골라주세요.',
        AGE_REQUIRED: '익명 보내기는 만 19세 이상만 쓸 수 있어요.',
        ANONYMOUS_DISABLED: '설정에서 익명 구슬을 켜야 보낼 수 있어요.',
      };
      notify('보내지 못했어요', msg[err.code] ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  // 보내기 취소: 5분 이내 + 아직 안 열어본 사람만, 받은 사람마다 따로 (세부 정책 2-3)
  const onCancelSend = () =>
    confirm({
      title: '보내기를 취소할까요?',
      message: '아직 확인하지 않은 사람에게서 감정구슬이 사라져요.',
      okText: '보내기 취소',
      destructive: true,
      onOk: async () => {
        try {
          const r = await cancelSent(sent?.dispatchId ?? null); // POST /dispatches/{id}/targets/{t}/cancel
          if (demoTimer.current) clearTimeout(demoTimer.current);
          reset();
          notify(
            '보내기를 취소했어요.',
            r.kept > 0 ? `${r.kept}명은 이미 확인해서 취소하지 못했어요.` : undefined,
          );
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

  // ← 뒤로 가기: 음악 넣기 → 색 다시 고르기, 음악 고르기 → 음악 넣기, 음악 구슬 → 음악 다시 고르기
  const onBack = () => {
    music.stop();
    if (step === 'ask') setStep('pick');
    else if (step === 'sound') setStep('ask');
    else if (step === 'ready') {
      setHasMusic(false);
      setStep('sound');
    }
  };
  const canGoBack = step === 'ask' || step === 'sound' || step === 'ready';

  const onDone = () => {
    reset();
    router.navigate('/');
  };

  const [first, second] = emotions;
  const firstEmotion = first ? getEmotion(first) : undefined;

  const isLowerStep = step === 'ask' || step === 'ready' || step === 'sent';
  const isSmallOrb = step === 'sound';

  const message =
    step === 'empty'
      ? ['지금 느끼는 감정을 보내보세요.', '+를 눌러 구슬 색상 추가하기.']
      : emotions.length === 0
        ? ['휠을 돌려 감정을 확인 하세요.', '터치 혹은 구슬을 눌러 선택하기.']
        : [
            emotions.map((k) => getEmotion(k).label).join(' + '),
            emotions.length === 1
              ? '감정 선택을 마쳤다면 구슬을 터치, 하나 더 고르면 섞기'
              : '감정 선택을 마쳤다면 구슬을 터치하기',
          ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerLayer} pointerEvents="box-none">
        <AppHeader title="감정 보내기" />
      </View>

      <View
        // 아래 단계는 버튼까지 터치되도록 영역을 늘림 (안드로이드는 영역 밖 터치가 안 됨)
        style={[styles.stage, (isLowerStep || isSmallOrb) && styles.stageTall]}
        pointerEvents="box-none"
      >
        {canGoBack && (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Image source={Icons.back} style={styles.backIcon} contentFit="contain" />
            <Text style={styles.backText}>
              {step === 'ask'
                ? '감정 다시 고르기'
                : step === 'sound'
                  ? '뒤로 가기'
                  : '음악 다시 고르기'}
            </Text>
          </Pressable>
        )}

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
            isSmallOrb && styles.orbSmall,
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
                    ? () => setStep('share') // 음악 구슬은 터치로 보내기
                    : onPressOrb
              }
            >
              {!firstEmotion && (
                <Image source={Icons.plus} style={styles.plus} contentFit="contain" />
              )}
            </EmotionOrb>
          </MusicOrb>
        </View>

        {/* ── 음악 넣기 (피그마 '감정_보내기_음악') ── */}
        {step === 'ask' && (
          <View style={styles.panel}>
            <Text style={styles.message}>
              {emotions.map((k) => getEmotion(k).label).join(' + ')}
            </Text>
            <Text style={styles.hint}>감정에 어울리는 음악을 넣을 수 있어요.</Text>
            <Pressable
              onPress={() => setStep('sound')}
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
          </View>
        )}

        {/* ── 샘플 음악 고르기 (15초, 무보컬). 누르면 바로 미리듣기 ── */}
        {step === 'sound' && (
          <View style={[styles.panel, styles.panelSmall]}>
            <Text style={styles.message}>어떤 음악을 넣을까요?</Text>
            <View style={styles.soundGrid}>
              {sounds.map((x) => {
                const on = x.id === soundId;
                return (
                  <Pressable
                    key={x.id}
                    onPress={() => setSoundId(x.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [
                      styles.soundChip,
                      on ? styles.chipOn : styles.btnDark,
                      pressed && styles.pressed,
                    ]}
                  >
                    {x.color && (
                      <View style={[styles.dot, { backgroundColor: getEmotion(x.color).glow }]} />
                    )}
                    <Text style={styles.chipLabel}>{x.title}</Text>
                    <Text style={styles.soundSec}>{x.seconds}초</Text>
                  </Pressable>
                );
              })}
            </View>
            {sounds.length === 0 && <Text style={styles.note}>음악 목록을 불러오지 못했어요.</Text>}
            <View style={styles.sentButtons}>
              <Pressable
                onPress={onlyOrb}
                style={({ pressed }) => [styles.btnHalf, styles.btnDark, pressed && styles.pressed]}
              >
                <Text style={styles.btnLabel}>음악 없이 보내기</Text>
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
                <Text style={styles.btnLabel}>이 음악 넣기</Text>
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
          <View style={styles.panel}>
            <Text style={styles.message}>{sound?.title} 음악을 넣었어요.</Text>
            {/* 돌리기 어려우면 눌러서 듣기 (유저플로우: 대체 재생 버튼) */}
            <Pressable
              onPress={() => (music.playing ? music.stop() : music.play())}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={music.playing ? '음악 멈추기' : '음악 듣기'}
              style={styles.playButton}
            >
              <Image source={Icons.headphones} style={styles.headphones} contentFit="contain" />
              <Text style={styles.note}>{music.playing ? '■ 멈추기' : '▶ 듣기'}</Text>
            </Pressable>
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
        selectedIds={recipientId ? [recipientId] : []}
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
  // 왼쪽 위 뒤로 가기 (구슬 위, 헤더 아래)
  back: {
    position: 'absolute',
    top: 6,
    left: 22,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  backIcon: { width: 13, height: 17 },
  backText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary },
  orb: { position: 'absolute' },
  plus: { width: 83, height: 83 },
  panel: { position: 'absolute', left: 0, right: 0, top: PANEL_TOP, alignItems: 'center' },
  // 단어 고르기·음악 설명은 칸이 많아서 구슬을 줄이고 패널을 위로 올림 (탭바에 버튼이 안 가리게)
  orbSmall: { transform: [{ translateY: -ORB_SIZE * 0.17 }, { scale: 0.62 }] },
  panelSmall: { top: SMALL_PANEL_TOP },
  btn: {
    alignSelf: 'stretch',
    marginHorizontal: 34,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  chipOn: {
    backgroundColor: '#4F6A7A',
    boxShadow: '0px 0px 12px rgba(110,160,190,0.35), 3px 3px 8px rgba(8,8,8,0.8)',
  },
  chipLabel: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textActive },
  btnLabel: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textActive },
  note: { marginTop: 12, fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  playButton: { alignItems: 'center', marginTop: 12, marginBottom: 8 },
  // 샘플 음악 칩 (2줄로)
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginHorizontal: 24,
  },
  soundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  soundSec: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  headphones: { width: 22, height: 22 },
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
