import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toApiError } from '@/api/client';
import { catalog, openReceipt, receipt } from '@/api/emori';
import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import MusicOrb from '@/components/MusicOrb';
import NeuButton from '@/components/NeuButton';
import OrbDetailSheet from '@/components/OrbDetailSheet';
import ReactionSheet from '@/components/ReactionSheet';
import ReceiveGlow from '@/components/ReceiveGlow';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { useApi } from '@/hooks/useApi';
import { useOrbMusic } from '@/hooks/useOrbMusic';
import { isOpened, markOpened } from '@/stores/inboxStore';
import type { ReceivedEmotion } from '@/types/emotion';
import { confirm, notify } from '@/utils/dialog';

const ORB_SIZE = 306;
const ORB_VISIBLE = 258; // 큰 구슬 공통 (메인·보내기와 동일)

// 단일 감정구슬 화면 (피그마 '친구에게_반응', PRD v1.4 4-3 / 4-4 / 4-7)
// - 최초 수신: 글로우 + (익명으로 받았으면) 반응하기 / 조용히 듣기 / 신고
//             친구(가까운 사람)에게 받은 구슬은 반응 기능 없음
// - 과거 기록 재진입 (?replay=1, 또는 수신함에서 이미 열어본 구슬):
//   글로우 다시 보여주고 음악만 다시 듣기. 버튼 없음, 새 수신으로 처리 X
export default function ReceivedScreen() {
  const { id, replay } = useLocalSearchParams<{ id?: string; replay?: string }>();
  // 처음 연 순간의 열람 여부로 판단 (열자마자 '열람'으로 바뀌어도 화면은 그대로)
  const [openedBefore] = useState(() => (id ? isOpened(id) : false));
  const wantReplay = replay === '1' || openedBefore;
  // 처음이면 POST /receipts/{id}/open (최초 1회 열람), 기록에서 다시 들어오면 GET .../replay
  const view = useApi(() => openReceipt(id, wantReplay), [id, wantReplay]);
  useEffect(() => {
    if (view.data) markOpened(view.data.received.id);
  }, [view.data]);

  if (view.error) {
    // 명세: 회수(보내기 취소)됐거나 내 것이 아니면 404 → '확인할 수 없는 구슬'
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.wordsText}>
          {view.error.status === 404 ? '확인할 수 없는 구슬이에요.' : view.error.message}
        </Text>
        <Pressable onPress={() => router.navigate('/reaction')} style={styles.backLink}>
          <Text style={styles.musicSub}>받은 감정으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }
  if (!view.data) return <View style={styles.root} />;
  const { received, replay: isReplay, canReact, actionToken } = view.data;
  // key 로 구슬이 바뀔 때마다 화면 상태·글로우를 새로 시작
  return (
    <ReceivedView
      key={`${received.id}-${isReplay}`}
      received={received}
      isReplay={isReplay}
      canReact={canReact}
      actionToken={actionToken}
    />
  );
}

function ReceivedView({
  received,
  isReplay,
  canReact,
  actionToken,
}: {
  received: ReceivedEmotion;
  isReplay: boolean;
  canReact: boolean;
  actionToken: string | null;
}) {
  const { width } = useWindowDimensions();
  const [first, second] = received.emotions;
  const emotion = getEmotion(first);
  const hasMusic = !!received.music;
  const isAnonymous = received.route === 'anonymous';
  // 반응 기능은 익명으로 받은 구슬의 최초 수신 화면에서만 (서버 actions 에 REACT 가 있을 때)
  // 섞은 구슬은 두 감정 이름, 하나면 감정 단어
  const words = second
    ? received.emotions.map((k) => getEmotion(k).label).join(' + ')
    : `${emotion.words.join(', ')}…`;

  const [answered, setAnswered] = useState(received.reacted || !canReact);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const music = useOrbMusic(received.music);

  // 반응 목록 (GET /catalog/reactions): 이모지 → 서버 코드
  const reactions = useApi(() => catalog.reactions(), []).data ?? [];
  const onSendReaction = (emoji: string) => {
    const code = reactions.find((r) => r.emoji === emoji)?.code ?? emoji;
    receipt
      .react(received.id, actionToken, code) // POST /receipts/{id}/reaction
      .then(() => {
        setMyReaction(emoji);
        setAnswered(true);
      })
      .catch((e) => {
        const err = toApiError(e);
        notify(err.code === 'ACTION_CLOSED' ? '이미 반응한 구슬이에요.' : err.message);
        setAnswered(true);
      });
  };

  // 조용히 듣기 / 반응 없이 화면을 떠나면 최초 반응 기회 종료 (POST /receipts/{id}/finish)
  const answeredRef = useRef(answered);
  useEffect(() => {
    answeredRef.current = answered;
  }, [answered]);
  useEffect(
    () => () => {
      if (canReact && !answeredRef.current) void receipt.finish(received.id, actionToken);
    },
    [canReact, received.id, actionToken],
  );
  const onQuiet = () => {
    void receipt.finish(received.id, actionToken);
    setAnswered(true);
  };

  const report = () =>
    confirm({
      title: '이 감정구슬을 신고할까요?',
      message: '부적절한 내용이 있다면 알려주세요. 보낸 사람에게는 알리지 않아요.',
      okText: '신고',
      destructive: true,
      onOk: () => {
        receipt
          .report(received.id) // POST /receipts/{id}/reports
          .then(() => notify('신고가 접수됐어요.'))
          .catch((e) => {
            const err = toApiError(e);
            notify(err.code === 'ALREADY_REPORTED' ? '이미 신고한 구슬이에요.' : err.message);
          });
      },
    });

  return (
    <View style={styles.root}>
      <ReceiveGlow color={emotion.glow} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title={received.senderName}
          subtitle={isReplay ? `${received.sentAtLabel} · 지난 기록` : received.sentAtLabel}
        />

        <View style={[styles.orb, { left: width / 2 - ORB_SIZE / 2 }]}>
          <MusicOrb
            size={ORB_SIZE}
            enabled={hasMusic}
            playing={music.playing}
            onPlay={music.play}
            onStop={music.stop}
            onTap={() => setDetailOpen(true)}
          >
            <EmotionOrb
              size={ORB_SIZE}
              source={emotion.image}
              imageStyle={orbImageStyle(emotion.key, ORB_VISIBLE)}
              overlaySource={second ? getEmotion(second).image : undefined}
              overlayImageStyle={second ? orbImageStyle(second, ORB_VISIBLE) : undefined}
              ringColor="#2A2418"
              glowColor="#E1D08A"
              shadowColor="#38400F"
            />
          </MusicOrb>
        </View>

        <Text style={styles.words} numberOfLines={1}>
          {words}
        </Text>

        {!answered ? (
          <View style={styles.buttons}>
            <NeuButton label="반응하기" variant="accent" onPress={() => setSheetOpen(true)} />
            <NeuButton label="조용히 듣기" variant="dark" onPress={onQuiet} />
          </View>
        ) : hasMusic ? (
          <View style={styles.music}>
            <Image source={Icons.headphones} style={styles.headphones} contentFit="contain" />
            <Text style={styles.musicTitle}>
              {music.playing ? '음악을 듣고 있어요.' : '감정과 관련 된 음악이 있어요.'}
            </Text>
            <Text style={styles.musicSub}>
              {music.playing
                ? '반대 방향으로 스와이프하면 멈춰요.'
                : '시계 방향으로 구슬을 스와이프 · 누르면 상세 기록'}
            </Text>
          </View>
        ) : (
          <View style={styles.music}>
            <Text style={styles.musicSub}>구슬을 누르면 상세 기록을 볼 수 있어요.</Text>
          </View>
        )}

        {canReact && (
          <Pressable onPress={report} hitSlop={10} style={styles.report} accessibilityRole="button">
            <Text style={styles.reportText}>신고하기</Text>
          </Pressable>
        )}
      </SafeAreaView>

      <ReactionSheet
        visible={sheetOpen}
        onSend={onSendReaction}
        onClose={() => setSheetOpen(false)}
        onGoMain={() => {
          setSheetOpen(false);
          router.navigate('/');
        }}
      />

      {/* 구슬 짧게 탭 → 이 구슬의 상세 기록 (PRD 4-5) */}
      <OrbDetailSheet
        visible={detailOpen}
        emotions={received.emotions}
        senderName={received.senderName}
        timeLabel={received.sentAtLabel}
        hasMusic={hasMusic}
        reaction={myReaction}
        showReaction={isAnonymous}
        onClose={() => setDetailOpen(false)}
      />
    </View>
  );
}

// 위치는 피그마 기준 (상태바 아래부터 잰 값)
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  // 열 수 없는 구슬 (회수됨·없음)
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  wordsText: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textSecondary },
  backLink: { padding: 8 },
  orb: { position: 'absolute', top: 117 + 47 },
  words: {
    position: 'absolute',
    top: 455 + 47,
    alignSelf: 'center',
    maxWidth: 260,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  buttons: { position: 'absolute', top: 498 + 47, left: 37, right: 37, gap: 13 },
  music: { position: 'absolute', top: 492 + 47, left: 0, right: 0, alignItems: 'center' },
  headphones: { width: 22, height: 22 },
  // 탭바와 안 겹치게 구슬 오른쪽 위에
  report: { position: 'absolute', top: 92 + 47, right: 24 },
  reportText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  musicTitle: {
    marginTop: 12,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  musicSub: {
    marginTop: 4,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
