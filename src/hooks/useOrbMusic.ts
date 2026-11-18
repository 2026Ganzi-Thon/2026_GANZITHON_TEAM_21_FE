import { useAudioPlayer, type AudioSource as PlayerSource } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { freshAccessToken } from '@/api/client';
import type { AudioSource } from '@/types/emotion';
import { notify } from '@/utils/dialog';

// 주소 → 캐시 파일 이름 (같은 음원은 한 번만 받음)
const cacheName = (uri: string) => {
  let h = 0;
  for (let i = 0; i < uri.length; i += 1) h = (h * 31 + uri.charCodeAt(i)) | 0;
  return `emori-sound-${(h >>> 0).toString(36)}.wav`; // 서버 음원은 WAV
};

// 서버 음원은 로그인 토큰을 헤더에 붙여야 재생됨 (명세 §6, FE_INTEGRATION)
// 폰: 토큰을 붙여 파일로 받아둔 뒤 그 파일을 재생 (스트리밍에 헤더가 안 붙는 경우 대비)
//     받기에 실패하면 헤더를 붙여 바로 재생 시도. 토큰은 주소에 넣지 않음
async function toPlayerSource(src: AudioSource): Promise<PlayerSource> {
  if (typeof src === 'number') return src;
  if (!src.auth) return { uri: src.uri };
  const token = await freshAccessToken(); // 만료가 가까우면 먼저 갱신
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  if (Platform.OS === 'web') return { uri: src.uri, headers };
  try {
    const file = new File(Paths.cache, cacheName(src.uri));
    if (!file.exists) await File.downloadFileAsync(src.uri, file, { headers, idempotent: true });
    return { uri: file.uri };
  } catch {
    return { uri: src.uri, headers };
  }
}

// 감정구슬 음악 재생 (PRD 4-5, 기능명세 MU-03 ~ MU-08)
// - 플레이리스트(AI 음악 최대 3곡)를 순서대로 한 번 재생
// - 자동 재생 X, play() 를 불러야만 재생
// - 화면을 떠나거나 앱이 백그라운드로 가면 정지
export function useOrbMusic(tracks?: AudioSource[]) {
  const player = useAudioPlayer(null);
  const [playing, setPlaying] = useState(false);
  const index = useRef(0); // 지금 재생 중인 곡
  const session = useRef(0); // 재생/정지할 때마다 +1 → 늦게 끝난 불러오기는 무시

  const stop = useCallback(() => {
    session.current += 1;
    try {
      player.pause();
    } catch {
      // 이미 정리된 플레이어면 무시
    }
    setPlaying(false);
  }, [player]);

  const playAt = useCallback(
    async (i: number, mySession: number) => {
      const src = tracks?.[i];
      if (!src) return;
      try {
        const source = await toPlayerSource(src);
        if (mySession !== session.current) return; // 그 사이 정지됨
        player.replace(source);
        player.play();
        index.current = i;
        setPlaying(true);
      } catch {
        if (mySession !== session.current) return;
        setPlaying(false);
        notify('음악을 재생하지 못했어요', '감정구슬은 그대로 확인할 수 있어요.');
      }
    },
    [player, tracks],
  );

  const play = useCallback(() => {
    if (!tracks?.length) return;
    session.current += 1;
    void playAt(0, session.current);
  }, [playAt, tracks]);

  // 한 곡이 끝나면 다음 곡, 마지막 곡이 끝나면 정지 상태로
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      const next = index.current + 1;
      if (tracks && next < tracks.length) void playAt(next, session.current);
      else setPlaying(false);
    });
    return () => sub.remove();
  }, [player, playAt, tracks]);

  // 앱이 백그라운드로 가면 정지 (MU-06)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
    });
    return () => sub.remove();
  }, [stop]);

  // 다른 화면으로 이동하면 정지 (MU-07)
  useFocusEffect(useCallback(() => stop, [stop]));

  return { playing, play, stop };
}
