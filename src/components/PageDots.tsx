import { Pressable, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = { count: number; activeIndex: number; onPressDot?: (index: number) => void };

// 구슬 아래 ● ○ ○ 페이지 표시
export default function PageDots({ count, activeIndex, onPressDot }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <Pressable
          key={i}
          onPress={onPressDot ? () => onPressDot(i) : undefined}
          disabled={!onPressDot}
          hitSlop={8}
          accessibilityLabel={`${i + 1}번째 화면`}
        >
          <View
            style={[
              styles.dot,
              i === 0 && styles.mine, // 첫 점 = 내 감정 (청록색)
              i === activeIndex && (i === 0 ? styles.mineActive : styles.active),
            ]}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 15 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2A2E36' },
  active: { backgroundColor: Colors.textSecondary },
  mine: { backgroundColor: Colors.lime400, opacity: 0.45 },
  mineActive: { opacity: 1 },
});
