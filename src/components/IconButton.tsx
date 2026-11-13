import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  icon: ImageSource;
  onPress?: () => void;
  iconSize?: number;
  accessibilityLabel?: string;
};

// 헤더의 동그란 볼록 버튼 (메뉴 / 친구추가 / 설정)
export default function IconButton({ icon, onPress, iconSize = 30, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Image source={icon} style={{ width: iconSize, height: iconSize }} contentFit="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  pressed: { opacity: 0.6 },
});
