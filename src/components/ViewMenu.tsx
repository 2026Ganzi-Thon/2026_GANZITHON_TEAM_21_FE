import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

type Props = {
  visible: boolean;
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
};

// 헤더 제목 "그룹 ⌄" 을 누르면 나오는 목록 (내 감정 / 그룹들)
export default function ViewMenu({ visible, items, selectedIndex, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.menu, { top: insets.top + 44 }]}>
          {items.map((label, i) => (
            <Pressable
              key={label}
              style={[styles.item, i > 0 && styles.divider]}
              onPress={() => {
                onSelect(i);
                onClose();
              }}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: i === selectedIndex }}
            >
              <Text style={[styles.text, i === selectedIndex && styles.textOn]}>{label}</Text>
              {i === selectedIndex && <View style={styles.dot} />}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  menu: {
    position: 'absolute',
    alignSelf: 'center',
    width: 200,
    borderRadius: 16,
    backgroundColor: '#232323',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#333' },
  text: { fontFamily: Fonts.regular, fontSize: 16, color: Colors.textSecondary },
  textOn: { fontFamily: Fonts.semiBold, color: Colors.white },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.lime400 },
});
