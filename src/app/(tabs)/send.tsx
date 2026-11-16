import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey, toApiError } from '@/api/client';
import {
  cancelSent,
  createOrb,
  dispatchOrb,
  friends as friendsApi,
  isMusicDone,
  music as musicApi,
  type MusicJob,
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
import type { EmotionKey, EmotionPick, SendRoute } from '@/types/emotion';
import { confirm, notify } from '@/utils/dialog';

const ORB_SIZE = 306; // 링 지름 300 (메인과 같은 크기)
const ORB_VISIBLE = 258; // 가운데 구슬이 화면에 보이는 지름 (큰 구슬 공통)
const STAGE_HEIGHT = 470;
const CENTER_Y = 224; // 헤더 아래 ~ 휠 중심 (피그마 기준)
const ORB_CENTER_Y = CENTER_Y; // 가운데 큰 구슬 = 휠 중심 (피그마)
const MAX_EMOTIONS = 2;
const PANEL_TOP = 400; // 음악 단계 안내·버튼 시작 위치 (탭바와 안 겹치게 고정)
const SMALL_PANEL_TOP = 300; // 단어 고르기·음악 설명 패널 (구슬을 줄여서 위로)
const PROMPT_MAX = 300; // 음악 설명 최대 글자 (명세 §6)
const POLL_MS = 3000; // 음악 생성 상태 확인 간격 (명세 §6: 약 3초)
const CANCEL_MS = 5 * 60 * 1000; // 보낸 뒤 5분 안에만 취소 가능 (세부 정책 2-1)

// 단계 (백엔드 v0.3 / 유저플로우)
// empty(+) → pick(휠, 1~2색) → word(색마다 단어 1개) → ask(음악 넣을지)
//   → prompt(음악 설명, 선택) → generating(3곡 생성, 3초마다 확인) → ready(돌려서 듣기) → share
//                                  └ failed(실패한 곡만 다시 만들기 / 음악 없이)
//   └ 감정 구슬만 보내기 ──────────────────────────────────────────────→ share → sent(5분 취소)
type Step =
  | 'empty'
  | 'pick'
  | 'word'
  | 'ask'
  | 'prompt'
  | 'generating'
  | 'failed'
  | 'ready'
  | 'share'
  | 'sent';

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
  const [words, setWords] = useState<Partial<Record<EmotionKey, string>>>({});
  const [prompt, setPrompt] = useState('');
  const [job, setJob] = useState<MusicJob | null>(null);
  const [musicOrbId, setMusicOrbId] = useState<string | null>(null); // 음악을 만든 초안 구슬
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

  const picks: EmotionPick[] = emotions.flatMap((key) =>
    words[key] ? [{ key, word: words[key]! }] : [],
  );
  const allWordsPicked = emotions.length > 0 && picks.length === emotions.length;
  const pickSig = picks.map((p) => `${p.key}:${p.word}`).join(',');

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
  const music = useOrbMusic(hasMusic ? job?.tracks : undefined);

  // 음악 생성 중: 약 3초마다 상태 확인 → 끝나면(완성·실패) 멈춤
  useEffect(() => {
    if (step !== 'generating' || !job || isMusicDone(job.status)) return;
    const t = setTimeout(() => {
      musicApi
        .status(job.id) // GET /asmr-generations/{id}
        .then((next) => {
          setJob(next);
          if (next.status === 'READY') {
            setHasMusic(true);
            setStep('ready');
          } else if (next.status === 'FAILED' || next.status === 'PARTIAL_FAILED') {
            setStep('failed');
          }
        })
        .catch(() => setJob({ ...job })); // 일시 오류면 다음 주기에 다시 확인
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [step, job]);

  // 음악 설명 입력할 때 키보드에 가리지 않게 화면을 올림
  const keyboard = useAnimatedKeyboard();
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.get() - 250) }],
  }));

  const toggleEmotion = (key: EmotionKey) => {
    setEmotions((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // 최대 2개까지 섞기 (서로 다른 색) - 3번째를 고르면 두 번째를 교체
      if (prev.length >= MAX_EMOTIONS) return [prev[0], key];
      return [...prev, key];
    });
  };

  const pickWord = (key: EmotionKey, word: string) =>
    setWords((prev) => ({ ...prev, [key]: prev[key] === word ? undefined : word }));

  // 친구에게는 한 번에 한 명 (세부 정책 2-2) → 다른 친구를 누르면 바뀜
  const toggleRecipient = (id: string) => setRecipientId((prev) => (prev === id ? null : id));

  // "감정 선택을 마쳤다면 바깥을 터치" → 단어 고르기
  const onPressOutside = () => {
    if (step === 'pick' && emotions.length > 0) setStep('word');
    if (step === 'prompt') Keyboard.dismiss();
  };

  const dropMusic = () => {
    music.stop();
    setHasMusic(false);
    setJob(null);
    setMusicOrbId(null);
  };

  // 단어를 다 골랐으면 음악 넣을지 묻기
  const onWordsDone = () => {
    if (!allWordsPicked) return;
    dropMusic(); // 단어가 바뀌면 음악도 새로 (재생성은 새 초안, 명세 §5)
    setStep('ask');
  };

  // 음악 만들기: 초안 구슬 → AI 음악 생성 요청 (설명은 안 써도 됨)
  const onGenerate = async () => {
    Keyboard.dismiss();
    if (busy) return;
    setBusy(true);
    try {
      const orbId = await createOrb(picks, keyFor(`orb-music:${pickSig}`)); // POST /orbs
      const started = await musicApi.start(orbId, prompt, keyFor(`music:${orbId}`)); // POST /orbs/{id}/asmr-generations
      keys.current.delete(`orb-music:${pickSig}`); // 다음에 다시 만들면 새 초안
      setMusicOrbId(orbId);
      setJob(started);
      if (started.status === 'READY') {
        setHasMusic(true);
        setStep('ready');
      } else
        setStep(
          started.status === 'QUEUED' || started.status === 'PROCESSING' ? 'generating' : 'failed',
        );
    } catch (e) {
      const err = toApiError(e);
      notify(
        '음악을 만들지 못했어요',
        err.code === 'GENERATION_UNAVAILABLE' || err.status === 503
          ? '지금은 음악을 만들 수 없어요. 감정 구슬만 보낼 수 있어요.'
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  };

  // 실패한 곡만 다시 만들기 (성공한 곡은 그대로)
  const onRetry = async () => {
    if (!job || busy) return;
    setBusy(true);
    try {
      const next = await musicApi.retry(job.id, newIdempotencyKey()); // POST /asmr-generations/{id}/retry
      setJob(next);
      setStep(next.status === 'READY' ? 'ready' : 'generating');
      if (next.status === 'READY') setHasMusic(true);
    } catch (e) {
      notify('다시 만들지 못했어요', toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  // 음악 없이 감정 구슬만 → 보낼 때 음악 없는 새 초안을 만듦
  const onlyOrb = () => {
    Keyboard.dismiss();
    dropMusic();
    setStep('share');
  };

  // 홈 화면 큰 위젯에서 구슬을 누르고 들어오면 (ganzithon21://send?emotion=blue)
  // 그 색을 골라둔 휠 화면에서 시작 → 하나 더 고르면 섞기, 바깥 터치하면 단어 고르기
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
      setJob(null);
      setMusicOrbId(null);
      setWords({});
      setPrompt('');
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
    setWords({});
    setPrompt('');
    setJob(null);
    setMusicOrbId(null);
    setRecipientId(null);
    setRoute('friends');
    setHasMusic(false);
  };

  const onSend = async () => {
    if (busy) return;
    if (route === 'friends' && !recipientId) return;
    setBusy(true);
    try {
      // 음악을 붙였으면 그 초안, 아니면 음악 없는 초안을 새로 (POST /orbs)
      const orbId =
        hasMusic && musicOrbId ? musicOrbId : await createOrb(picks, keyFor(`orb:${pickSig}`));
      const friendId = route === 'friends' ? recipientId : null;
      // POST /orbs/{id}/dispatches (나에게 / 친구 1명 / 익명)
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
      setSent({
        until: result.cancelUntil ?? at + CANCEL_MS,
        dispatchId: result.dispatchId,
        done,
        labels: `${picks.map((p) => p.word).join(' + ')}${hasMusic ? ' · 음악 3곡' : ''}`,
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
        PLAYLIST_NOT_READY: '음악이 아직 다 만들어지지 않았어요.',
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

  const onDone = () => {
    reset();
    router.navigate('/');
  };

  const [first, second] = emotions;
  const firstEmotion = first ? getEmotion(first) : undefined;

  const isLowerStep =
    step === 'ask' ||
    step === 'generating' ||
    step === 'failed' ||
    step === 'ready' ||
    step === 'sent';
  const isSmallOrb = step === 'word' || step === 'prompt';

  const message =
    step === 'empty'
      ? ['지금 느끼는 감정을 보내보세요.', '+를 눌러 구슬 색상 추가하기.']
      : emotions.length === 0
        ? ['휠을 돌려 감정을 확인 하세요.', '터치 혹은 구슬을 눌러 선택하기.']
        : [
            emotions.map((k) => getEmotion(k).label).join(' + '),
            emotions.length === 1
              ? '바깥을 터치하면 단어 고르기, 하나 더 고르면 섞기'
              : '바깥을 터치해서 단어 고르기',
          ];

  const failedCount = job ? job.total - job.done : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPressOutside} />

      <View style={styles.headerLayer} pointerEvents="box-none">
        <AppHeader title="감정 보내기" />
      </View>

      <Animated.View
        // 아래 단계는 버튼까지 터치되도록 영역을 늘림 (안드로이드는 영역 밖 터치가 안 됨)
        style={[styles.stage, (isLowerStep || isSmallOrb) && styles.stageTall, liftStyle]}
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

        {/* ── 단어 고르기: 색마다 단어 1개 (백엔드 v0.3, 유저플로우) ── */}
        {step === 'word' && (
          <View style={[styles.panel, styles.panelSmall]}>
            <Text style={styles.message}>지금 감정에 가까운 단어를 골라주세요.</Text>
            {emotions.map((key) => {
              const e = getEmotion(key);
              return (
                <View key={key} style={styles.wordGroup}>
                  <Text style={styles.wordArea}>{e.label}</Text>
                  <View style={styles.wordChips}>
                    {e.words.map((w) => {
                      const on = words[key] === w;
                      return (
                        <Pressable
                          key={w}
                          onPress={() => pickWord(key, w)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          style={({ pressed }) => [
                            styles.chip,
                            on ? styles.chipOn : styles.btnDark,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.chipLabel}>{w}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <View style={styles.sentButtons}>
              <Pressable
                onPress={() => setStep('pick')}
                style={({ pressed }) => [styles.btnHalf, styles.btnDark, pressed && styles.pressed]}
              >
                <Text style={styles.btnLabel}>색 다시 고르기</Text>
              </Pressable>
              <Pressable
                onPress={onWordsDone}
                disabled={!allWordsPicked}
                style={({ pressed }) => [
                  styles.btnHalf,
                  styles.btnAccent,
                  !allWordsPicked && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.btnLabel}>다음</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── 음악 넣기 (피그마 '감정_보내기_음악') ── */}
        {step === 'ask' && (
          <View style={styles.panel}>
            <Text style={styles.message}>{picks.map((p) => p.word).join(' + ')}</Text>
            <Text style={styles.hint}>감정에 어울리는 음악을 만들어 넣을 수 있어요.</Text>
            <Pressable
              onPress={() => setStep('prompt')}
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

        {/* 음악 설명 (선택). 비워둬도 고른 감정으로 만듦 */}
        {step === 'prompt' && (
          <View style={styles.panelPrompt}>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder={
                '어떤 음악이면 좋을지 적어주세요. (안 써도 돼요)\n\nex) 긴장을 풀 수 있는 잔잔한 빗소리'
              }
              placeholderTextColor="#8A8F98"
              multiline
              maxLength={PROMPT_MAX}
              textAlignVertical="top"
              style={styles.prompt}
            />
            <Pressable
              onPress={onGenerate}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                styles.btnFull,
                styles.btnAccent,
                styles.btnStack,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnLabel}>{busy ? '요청하는 중…' : '음악 만들기'}</Text>
            </Pressable>
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
          </View>
        )}

        {step === 'generating' && job && (
          <View style={styles.panel}>
            <Text style={styles.message}>감정에 어울리는 음악을 만들고 있어요.</Text>
            <View style={styles.track}>
              <View
                style={[styles.bar, { width: `${Math.max(8, (job.done / job.total) * 100)}%` }]}
              />
            </View>
            <Text style={styles.note}>
              {job.done}/{job.total}곡 완성 · 잠시만 기다려주세요
            </Text>
            <Pressable
              onPress={onlyOrb}
              style={({ pressed }) => [
                styles.btn,
                styles.btnDark,
                styles.btnFirst,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnLabel}>음악 없이 보내기</Text>
            </Pressable>
          </View>
        )}

        {step === 'failed' && job && (
          <View style={styles.panel}>
            <Text style={styles.message}>
              {job.done > 0
                ? `음악 ${job.total}곡 중 ${failedCount}곡을 만들지 못했어요.`
                : '음악을 만들지 못했어요.'}
            </Text>
            <Pressable
              onPress={onRetry}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                styles.btnAccent,
                styles.btnFirst,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnLabel}>
                {job.done > 0 ? '못 만든 곡 다시 만들기' : '다시 만들기'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onlyOrb}
              style={({ pressed }) => [styles.btn, styles.btnDark, pressed && styles.pressed]}
            >
              <Text style={styles.btnLabel}>음악 없이 보내기</Text>
            </Pressable>
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
            <Text style={styles.message}>{picks.map((p) => p.word).join(' + ')}</Text>
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
            <Text style={styles.message}>
              감정과 어울리는 음악 {job?.done ?? 3}곡을 만들었어요.
            </Text>
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
  orb: { position: 'absolute' },
  plus: { width: 83, height: 83 },
  panel: { position: 'absolute', left: 0, right: 0, top: PANEL_TOP, alignItems: 'center' },
  // 단어 고르기·음악 설명은 칸이 많아서 구슬을 줄이고 패널을 위로 올림 (탭바에 버튼이 안 가리게)
  orbSmall: { transform: [{ translateY: -ORB_SIZE * 0.17 }, { scale: 0.62 }] },
  panelSmall: { top: SMALL_PANEL_TOP },
  panelPrompt: { position: 'absolute', left: 34, right: 34, top: SMALL_PANEL_TOP },
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
  btnStack: { marginBottom: 13 },
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
  // 단어 칩
  wordGroup: { alignSelf: 'stretch', marginTop: 14, marginHorizontal: 34 },
  wordArea: {
    marginBottom: 8,
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  wordChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: '#4F6A7A',
    boxShadow: '0px 0px 12px rgba(110,160,190,0.35), 3px 3px 8px rgba(8,8,8,0.8)',
  },
  chipLabel: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textActive },
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
  btnLabel: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textActive },
  note: { marginTop: 12, fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  playButton: { alignItems: 'center', marginTop: 12, marginBottom: 8 },
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
