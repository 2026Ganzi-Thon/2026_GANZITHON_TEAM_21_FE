import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

// TODO: 반응 화면 (피그마 구현 예정)
export default function Screen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="반응" />
      <Text style={styles.text}>준비 중</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  text: { marginTop: 40, textAlign: 'center', fontFamily: Fonts.regular, color: Colors.textMuted },
});
