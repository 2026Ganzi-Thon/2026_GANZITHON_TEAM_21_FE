import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ApiError } from '@/api/client';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

type Props = {
  error: ApiError;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
};

// 불러오기 실패 안내 + 다시 시도
// 서버가 안 될 때 목록이 그냥 비어 보이면 '진짜 없음'이랑 구분이 안 돼서 따로 보여줌
export default function LoadError({ error, onRetry, style }: Props) {
  const offline = error.code === 'NETWORK' || error.status === 0 || error.status >= 500;
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>
        {offline ? '연결이 불안정해서 불러오지 못했어요.' : error.message}
      </Text>
      <Pressable onPress={onRetry} hitSlop={10} accessibilityRole="button">
        <Text style={styles.retry}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  text: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  retry: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textActive,
    textDecorationLine: 'underline',
  },
});
