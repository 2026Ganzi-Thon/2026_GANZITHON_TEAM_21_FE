import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { USE_MOCK } from '@/api/client';
import { ackCare, care } from '@/api/emori';
import { getCareStage } from '@/constants/care';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useApi } from '@/hooks/useApi';
import { mockMyDays } from '@/mocks/care';
import { dismissCareCard, useCare } from '@/stores/careStore';

// 케어 넛지 홈 카드 (PRD 6장, 세부 정책 3장)
// 진단·경고처럼 보이지 않게 부드러운 문장 + 누르면 자세한 안내
// 단계: 서버(GET /me/care)가 계산. 목업이면 기존 계산(mockMyDays)

// 마음 돋보기 화면용: 지금 조건 단계 (카드를 이미 봤어도 내용은 보여줌)
export function useRawCareStage(): 0 | 1 | 2 {
  const server = useApi(() => care(), []);
  if (server.data) return server.data.level;
  return USE_MOCK ? getCareStage(mockMyDays) : 0;
}

// 홈 카드용: 서버가 notice 를 줄 때만 (각 단계 처음 1번, 보거나 닫으면 다시 안 나옴)
// 설정에서 껐거나 이번에 닫았으면 안 보임
export function useCareCard(): { stage: 0 | 1 | 2; noticeId: string | null } {
  const local = useCare();
  const server = useApi(() => care(), []);
  if (!local.enabled || local.dismissed) return { stage: 0, noticeId: null };
  if (USE_MOCK) return { stage: getCareStage(mockMyDays), noticeId: null };
  const notice = server.data?.notice;
  return notice ? { stage: notice.level, noticeId: notice.id } : { stage: 0, noticeId: null };
}

// 기획 확정 문구 (11/18): 제목은 상세 화면과 같음
const COPY = {
  1: { title: '최근 마음이 조금 지쳐 있지는 않나요?', sub: '나를 돌보는 방법 보기' },
  2: {
    title: '혼자 감당하기 어렵다면, 전문적인 도움을 받아보세요.',
    sub: '도움받을 수 있는 곳 보기',
  },
} as const;

export default function CareCard({ stage, noticeId }: { stage: 1 | 2; noticeId: string | null }) {
  const copy = COPY[stage];
  // 카드를 눌러 상세로 가면 '확인', 닫으면 '닫음' → 서버가 이 단계는 다시 안 보여줌
  const open = () => {
    if (noticeId) void ackCare(noticeId, 'VIEWED');
    dismissCareCard();
    router.navigate({ pathname: '/care', params: { stage: String(stage) } });
  };
  const close = () => {
    if (noticeId) void ackCare(noticeId, 'DISMISSED');
    dismissCareCard();
  };
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.leaf}>🌿</Text>
      <View style={styles.texts}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub} ›</Text>
      </View>
      <Pressable onPress={close} hitSlop={12} accessibilityLabel="안내 닫기" style={styles.close}>
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
