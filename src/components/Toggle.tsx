import { Pressable, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel?: string;
};

// 설정 화면 on/off 스위치 (피그마 104x56 → 35x19)
export default function Toggle({ value, onChange, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={[styles.track, value ? styles.trackOn : styles.trackOff]}
    >
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 35,
    height: 19,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackOn: { backgroundColor: Colors.lime400 },
  trackOff: { backgroundColor: '#2E3138' },
  knob: { width: 15, height: 15, borderRadius: 8 },
  knobOn: { alignSelf: 'flex-end', backgroundColor: Colors.white },
  knobOff: { alignSelf: 'flex-start', backgroundColor: '#D9D9D9' },
});
