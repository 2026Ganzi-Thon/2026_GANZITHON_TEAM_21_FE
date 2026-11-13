import createQR from 'qrcode-generator';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  value: string;
  size: number;
  color?: string; // 칸 색 (피그마: 어두운 배경 위 밝은 칸)
};

// QR 코드 (외부 네이티브 모듈 없이 View 로 그림)
// 한 줄에서 이어지는 칸은 하나의 막대로 합쳐서 View 개수를 줄임
export default function QRCode({ value, size, color = '#F0F0F3' }: Props) {
  const { count, bars } = useMemo(() => {
    const qr = createQR(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const runs: { row: number; col: number; len: number }[] = [];
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!qr.isDark(r, c)) {
          c++;
          continue;
        }
        const start = c;
        while (c < n && qr.isDark(r, c)) c++;
        runs.push({ row: r, col: start, len: c - start });
      }
    }
    return { count: n, bars: runs };
  }, [value]);

  const cell = size / count;

  return (
    <View style={{ width: size, height: size }}>
      {bars.map((b) => (
        <View
          key={`${b.row}-${b.col}`}
          style={[
            styles.bar,
            {
              left: b.col * cell,
              top: b.row * cell,
              width: b.len * cell + 0.5, // 칸 사이 틈 방지
              height: cell + 0.5,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ bar: { position: 'absolute' } });
