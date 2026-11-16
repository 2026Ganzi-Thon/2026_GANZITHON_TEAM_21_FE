import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NeuButton from '@/components/NeuButton';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useDragToClose } from '@/hooks/useDragToClose';

// 단계: + 누르기 → 반응 고르기 → 보낼지 확인 → 완료
type Step = 'pick' | 'emoji' | 'done';

export type ReactionOption = { code: string; label: string; emoji: string };

type Props = {
  visible: boolean;
  options: ReactionOption[]; // 서버 반응 목록 (기본: 마음 전하기 / 안아주기 / 응원하기)
  onSend: (code: string) => void;
  onClose: () => void;
  onGoMain: () => void;
};

// 반응 선택 하단 시트 (피그마 '친구에게_반응1~4')
// 백엔드 v0.3: 이모지 키보드 대신 정해진 반응 3개 중에서 고름
export default function ReactionSheet({ visible, options, onSend, onClose, onGoMain }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('pick');
  const [code, setCode] = useState<string | null>(null);
  const chosen = options.find((o) => o.code === code);

  const close = () => {
    onClose();
    // 닫히는 애니메이션 끝난 뒤 초기화
    setTimeout(() => {
      setStep('pick');
      setCode(null);
    }, 300);
  };

  const { drag, sheetStyle, onLayout } = useDragToClose(visible, () => close());

  const send = () => {
    if (!code) return;
    onSend(code);
    setStep('done');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} />

        <Animated.View
          onLayout={onLayout}
          style={[
            styles.sheet,
            { height: 395 + insets.bottom * 0.3 },
            { paddingBottom: insets.bottom },
            sheetStyle,
          ]}
        >
          {/* 손잡이를 아래로 끌면 닫힘 */}
          <GestureDetector gesture={drag}>
            <View style={styles.dragArea} collapsable={false}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          {step === 'done' ? (
            <View style={styles.center}>
              <Image source={Icons.check} style={styles.check} contentFit="contain" />
              <Text style={styles.title}>반응을 성공적으로 보냈어요</Text>
            </View>
          ) : (
            <View style={styles.center}>
              {/* 가운데 동그라미: 아직 안 골랐으면 +, 골랐으면 이모지 */}
              <Pressable
                style={styles.emojiCircle}
                onPress={() => setStep(step === 'emoji' ? 'pick' : 'emoji')}
                accessibilityLabel="반응 고르기"
              >
                {chosen ? (
                  <Text style={styles.bigEmoji}>{chosen.emoji}</Text>
                ) : (
                  <Image source={Icons.plus} style={styles.plus} contentFit="contain" />
                )}
              </Pressable>

              {step === 'emoji' ? (
                <View style={styles.options}>
                  {options.map((o) => (
                    <Pressable
                      key={o.code}
                      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                      onPress={() => {
                        setCode(o.code);
                        setStep('pick');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={o.label}
                    >
                      <Text style={styles.optionEmoji}>{o.emoji}</Text>
                      <Text style={styles.optionLabel}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : chosen ? (
                <Text style={styles.title}>{chosen.label} 반응을 보낼까요?</Text>
              ) : (
                <>
                  <Text style={styles.title}>보낼 반응을 선택해주세요</Text>
                  <Text style={styles.sub}>+를 누르면 반응을 선택 할 수 있어요.</Text>
                </>
              )}
            </View>
          )}

          {step !== 'emoji' && (
            <View style={styles.buttons}>
              {step === 'done' ? (
                <NeuButton label="구슬(메인)로 이동" variant="light" onPress={onGoMain} />
              ) : (
                <NeuButton label="보내기" variant="light" disabled={!code} onPress={send} />
              )}
              <NeuButton label="닫기" variant="dark" onPress={close} />
            </View>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1 },
  dragArea: { paddingBottom: 6 }, // 손잡이 주변까지 끌기 영역
  sheet: {
    backgroundColor: '#1B1B1B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 9,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(235,235,245,0.3)',
  },
  center: { flex: 1, alignItems: 'center', paddingTop: 14 },
  emojiCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#0E0E0E',
    borderWidth: 2,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  plus: { width: 40, height: 40 },
  bigEmoji: { fontSize: 52 },
  check: { width: 80, height: 80, marginTop: 8 },
  title: {
    marginTop: 26,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  sub: { marginTop: 6, fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  // 반응 3개
  options: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
    paddingHorizontal: 18,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#262626',
  },
  optionPressed: { opacity: 0.7 },
  optionEmoji: { fontSize: 34 },
  optionLabel: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary },
  buttons: { gap: 12, paddingHorizontal: 18, paddingBottom: 16 },
});
