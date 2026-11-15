import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCareStage } from '@/constants/care';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { mockMyDays } from '@/mocks/care';
import { dismissCareCard, useCare } from '@/stores/careStore';

// 케어 넛지 홈 카드 (PRD 6장, 기획 답변: 경고창이 아니라 홈에 자연스러운 카드로)
// 진단·경고처럼 보이지 않게 부드러운 문장 + 누르면 자세한 안내
export function useCareStage() {
  const care = useCare();
  const stage = getCareStage(mockMyDays); // TODO: 내 감정 기록 API
  return care.enabled && !care.dismissed ? stage : 0;
}

const COPY = {
  1: { title: '요즘 마음이 조금 무거웠나 봐요', sub: '나를 돌보는 작은 방법을 볼까요' },
  2: { title: '혼자 견디지 않아도 괜찮아요', sub: '이야기 나눌 수 있는 곳을 알려드릴게요' },
} as const;

export default function CareCard({ stage }: { stage: 1 | 2 }) {
  const copy = COPY[stage];
  return (
    <Pressable
      onPress={() => router.navigate('/care')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.leaf}>🌿</Text>
      <View style={styles.texts}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub} ›</Text>
      </View>
      <Pressable
        onPress={dismissCareCard}
        hitSlop={12}
        accessibilityLabel="안내 닫기"
        style={styles.close}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(131,219,214,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(131,219,214,0.35)',
  },
  pressed: { opacity: 0.75 },
  leaf: { fontSize: 22 },
  texts: { flex: 1, gap: 3 },
  title: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textPrimary },
  sub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary },
  close: { padding: 4 },
  closeText: { fontSize: 12, color: Colors.textMuted },
});
