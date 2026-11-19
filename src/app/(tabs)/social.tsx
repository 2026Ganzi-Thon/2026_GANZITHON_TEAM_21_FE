import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { toApiError } from '@/api/client';
import { friends as friendsApi } from '@/api/emori';
import AppHeader from '@/components/AppHeader';
import LoadError from '@/components/LoadError';
import PersonRow from '@/components/PersonRow';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useApi } from '@/hooks/useApi';
import type { Friend } from '@/mocks/social';
import { confirm, notify } from '@/utils/dialog';

// 햄버거 > 소셜 목록 (피그마 '소셜_목록')
// - 친구 줄: 이번 주 구슬 / 이름 / ♡ 즐겨찾기 / ✕ 삭제
// - 아래 검색칸으로 이름 찾기
export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  // GET /friends (수락된 친구만)
  const list = useApi(() => friendsApi.list(), []);
  const friends = list.data ?? [];
  const setFriends = (fn: (prev: Friend[]) => Friend[]) => list.setData((prev) => fn(prev ?? []));
  const [query, setQuery] = useState('');

  const bottomGap = insets.bottom + TAB_BAR_BOTTOM_GAP + TAB_BAR_HEIGHT + 29;
  const shown = friends.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()));

  const toggleFavorite = (id: string) => {
    // 즐겨찾기는 PRD·명세에 없어서 이 기기에서만 (앱을 다시 켜면 초기화)
    setFriends((prev) => prev.map((f) => (f.id === id ? { ...f, favorite: !f.favorite } : f)));
  };

  const remove = (friend: Friend) => {
    confirm({
      title: `${friend.name}님을 목록에서 삭제할까요?`,
      okText: '삭제',
      destructive: true,
      onOk: () =>
        friendsApi
          .remove(friend.id) // DELETE /friends/{id} (주고받은 구슬 기록은 그대로, PRD 5-5)
          .then(() => setFriends((prev) => prev.filter((f) => f.id !== friend.id)))
          .catch((e) => notify('삭제하지 못했어요', toApiError(e).message)),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="소셜 목록" />

      {/* 친구 찾기 칸은 목록 위에 고정 (목록이 길어져도 안 가려지게) */}
      <View style={styles.search}>
        <Text style={styles.searchLabel}>친구 찾기</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="친구 이름을 입력해주세요."
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>소셜 목록</Text>

        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomGap }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {shown.map((friend) => (
            <PersonRow key={friend.id} name={friend.name} emotion={friend.emotion}>
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
            </PersonRow>
          ))}
          {list.error ? (
            <LoadError error={list.error} onRetry={list.reload} />
          ) : (
            shown.length === 0 && (
              <Text style={styles.empty}>
                {friends.length === 0
                  ? '아직 친구가 없어요. 오른쪽 위에서 친구를 추가해보세요.'
                  : '찾는 친구가 없어요.'}
              </Text>
            )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  sectionLabel: {
    marginTop: 22,
    marginLeft: 38,
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#808B9F',
  },
  list: { flex: 1, marginTop: 7 },
  listContent: { paddingTop: 10, paddingBottom: 24, gap: 21.7 },
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
  search: { paddingHorizontal: 35, paddingTop: 20 },
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
    fontSize: 16, // 16 미만이면 아이폰 웹에서 입력할 때 화면이 확대됨
    color: Colors.textPrimary,
  },
});
