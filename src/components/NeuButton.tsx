import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/typography';

type Variant = 'light' | 'dark' | 'accent';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  accentColor?: string; // variant='accent' 일 때 배경색 (감정 색)
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// 큰 볼록 버튼 (반응하기 / 조용히 듣기 / 보내기 / 닫기)
export default function NeuButton({
  label,
  onPress,
  variant = 'dark',
  accentColor,
  disabled,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        variant === 'accent' && accentColor ? { backgroundColor: accentColor } : null,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F0F0F',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.9,
    shadowRadius: 11,
    elevation: 8,
  },
  light: { backgroundColor: '#5C5C5C' },
  dark: { backgroundColor: '#262626' },
  // 반응하기: 감정 색 (피그마 노랑 구슬 기준 #80754B)
  accent: { backgroundColor: '#80754B', borderWidth: 0.5, borderColor: '#575348' },
  disabled: { backgroundColor: '#232323', shadowOpacity: 0.4 },
  pressed: { opacity: 0.75 },
  label: { fontFamily: Fonts.semiBold, fontSize: 14.5, color: '#EEEEEE' },
  labelDisabled: { color: '#555555' },
});
