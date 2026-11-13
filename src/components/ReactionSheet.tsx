import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NeuButton from '@/components/NeuButton';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { REACTION_EMOJIS } from '@/mocks/receive';

// 단계: + 누르기 → 이모지 고르기 → 보낼지 확인 → 완료
type Step = 'pick' | 'emoji' | 'done';

type Props = {
  visible: boolean;
  onSend: (emoji: string) => void;
  onClose: () => void;
  onGoMain: () => void;
};

// 반응 선택 하단 시트 (피그마 '친구에게_반응1~4')
export default function ReactionSheet({ visible, onSend, onClose, onGoMain }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('pick');
  const [emoji, setEmoji] = useState<string | null>(null);

  const close = () => {
    onClose();
    // 닫히는 애니메이션 끝난 뒤 초기화
    setTimeout(() => {
      setStep('pick');
      setEmoji(null);
    }, 300);
  };

  const send = () => {
    if (!emoji) return;
    onSend(emoji);
    setStep('done');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />

      <View
        style={[
          styles.sheet,
          { height: (step === 'emoji' ? 557 : 395) + insets.bottom * 0.3 },
          { paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.handle} />

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
              accessibilityLabel="반응 이모지 고르기"
            >
              {emoji ? (
                <Text style={styles.bigEmoji}>{emoji}</Text>
              ) : (
                <Image source={Icons.plus} style={styles.plus} contentFit="contain" />
              )}
            </Pressable>

            {step === 'emoji' ? (
              <ScrollView
                style={styles.grid}
                contentContainerStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
              >
                {REACTION_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    style={styles.gridItem}
                    onPress={() => {
                      setEmoji(e);
                      setStep('pick');
                    }}
                  >
                    <Text style={styles.gridEmoji}>{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : emoji ? (
              <Text style={styles.title}>이 반응을 보낼까요?</Text>
            ) : (
              <>
                <Text style={styles.title}>보낼 반응을 선택해주세요</Text>
                <Text style={styles.sub}>+를 누르면 이모지를 선택 할 수 있어요.</Text>
              </>
            )}
          </View>
        )}

        {step !== 'emoji' && (
          <View style={styles.buttons}>
            {step === 'done' ? (
              <NeuButton label="구슬(메인)로 이동" variant="light" onPress={onGoMain} />
            ) : (
              <NeuButton label="보내기" variant="light" disabled={!emoji} onPress={send} />
            )}
            <NeuButton label="닫기" variant="dark" onPress={close} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
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
  grid: { alignSelf: 'stretch', marginTop: 18 },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  gridItem: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  gridEmoji: { fontSize: 30 },
  buttons: { gap: 12, paddingHorizontal: 18, paddingBottom: 16 },
});
