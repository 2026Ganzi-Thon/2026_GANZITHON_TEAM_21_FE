import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';

// 감정구슬 음악 재생 (기능명세 MU-03 ~ MU-08)
// - 자동 재생 X, play() 를 불러야만 재생
// - 화면을 떠나거나 앱이 백그라운드로 가면 정지
export function useOrbMusic(source?: number) {
  const player = useAudioPlayer(source ?? null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    try {
      player.pause();
      player.seekTo(0);
    } catch {
      // 이미 정리된 플레이어면 무시
    }
    setPlaying(false);
  }, [player]);

  const play = useCallback(() => {
    if (!source) return;
    try {
      player.seekTo(0);
      player.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      Alert.alert('음악을 재생하지 못했어요', '감정구슬은 그대로 확인할 수 있어요.');
    }
  }, [player, source]);

  // 15초 이내 음원이 끝나면 정지 상태로
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) setPlaying(false);
    });
    return () => sub.remove();
  }, [player]);

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
