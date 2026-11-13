import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Icons } from '@/constants/assets';
import { Colors, NeuCard } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { mockFriends, type Friend } from '@/mocks/social';

const ORB = 44;

// 햄버거 > 소셜 목록 (피그마 '소셜_목록')
// - 친구 줄: 이번 주 구슬 / 이름 / ♡ 즐겨찾기 / ✕ 삭제
// - 아래 검색칸으로 이름 찾기
export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>(mockFriends);
  const [query, setQuery] = useState('');

  const bottomGap = insets.bottom + TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT + 29;
  const shown = friends.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()));

  const toggleFavorite = (id: string) => {
    setFriends((prev) => prev.map((f) => (f.id === id ? { ...f, favorite: !f.favorite } : f)));
    // TODO: 즐겨찾기 API
  };

  const remove = (friend: Friend) => {
    Alert.alert(`${friend.name}님을 목록에서 삭제할까요?`, undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => setFriends((prev) => prev.filter((f) => f.id !== friend.id)),
        // TODO: 친구 삭제 API
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="소셜 목록" />

      {/* 검색칸을 누르면 키보드 바로 위로 올라오게 */}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={-bottomGap}
      >
        <Text style={styles.sectionLabel}>소셜 목록</Text>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {shown.map((friend) => {
            const emotion = getEmotion(friend.emotion);
            return (
              <View key={friend.id} style={styles.row}>
                <View style={styles.orb}>
                  <Image
                    source={emotion.image}
                    style={orbImageStyle(emotion.key, ORB)}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {friend.name}
                </Text>
                <Pressable
                  onPress={() => toggleFavorite(friend.id)}
                  hitSlop={6}
                  accessibilityLabel={friend.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                  accessibilityState={{ selected: friend.favorite }}
                  style={styles.heart}
                >
                  <Image
                    source={Icons.heartOutline}
                    style={styles.icon}
                    tintColor={friend.favorite ? '#FB7575' : undefined}
                    contentFit="contain"
                  />
                </Pressable>
                <Pressable
                  onPress={() => remove(friend)}
                  hitSlop={6}
                  accessibilityLabel="삭제"
                  style={styles.remove}
                >
                  <Image source={Icons.xRed} style={styles.icon} contentFit="contain" />
                </Pressable>
              </View>
            );
          })}
          {shown.length === 0 && <Text style={styles.empty}>찾는 친구가 없어요.</Text>}
        </ScrollView>

        <View style={[styles.search, { marginBottom: bottomGap }]}>
          <Text style={styles.searchLabel}>검색으로 찾기</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="아이디를 입력해주세요."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  sectionLabel: {
    marginTop: 20,
    marginLeft: 38,
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#808B9F',
  },
  list: { flex: 1, marginTop: 10, overflow: 'visible' },
  listContent: { paddingTop: 8, paddingBottom: 24, gap: 21.7 },
  // 피그마: 줄이 화면 양옆 밖까지 이어짐
  row: {
    ...NeuCard,
    marginHorizontal: -20,
    height: 64,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orb: {
    position: 'absolute',
    left: 83 - ORB / 2,
    width: ORB,
    height: ORB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    position: 'absolute',
    left: 125,
    right: 140,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.white,
  },
  heart: { position: 'absolute', left: 316 },
  remove: { position: 'absolute', left: 354 },
  icon: { width: 33, height: 33 },
  empty: {
    marginTop: 24,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },
  search: { paddingHorizontal: 35, paddingTop: 12 },
  searchLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
