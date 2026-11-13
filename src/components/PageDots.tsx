import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = { count: number; activeIndex: number };

// 구슬 아래 ● ○ ○ 페이지 표시
export default function PageDots({ count, activeIndex }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 15 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2A2E36' },
  active: { backgroundColor: Colors.textSecondary },
});
