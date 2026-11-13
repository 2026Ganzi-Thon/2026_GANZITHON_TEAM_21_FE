import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import PersonRow from '@/components/PersonRow';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Icons } from '@/constants/assets';
import { Colors, NeuCard } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { mockMe } from '@/mocks/me';
import { mockRequests, mockUsers, type FriendRequest, type SearchUser } from '@/mocks/friendAdd';
import { notify } from '@/utils/dialog';

// 헤더 👤+ > 친구 추가 (피그마 '친구추가' / '친구추가-입력')
// - 검색칸이 비어 있으면: 받은 친구 요청 (⊕ 수락 / ⊗ 거절)
// - 아이디를 입력하면: 검색 결과 (👤+ 요청 보내기)
export default function FriendAddScreen() {
  const [query, setQuery] = useState('');
  const [requests, setRequests] = useState<FriendRequest[]>(mockRequests);
  const [users, setUsers] = useState<SearchUser[]>(mockUsers);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const results = users.filter((u) => u.name.toLowerCase().includes(q));

  const answer = (req: FriendRequest, accept: boolean) => {
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    // TODO: 친구 요청 수락/거절 API
    if (accept) notify(`${req.name}님과 친구가 됐어요.`);
  };

  const sendRequest = (user: SearchUser) => {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: 'requested' } : u)));
    // TODO: 친구 요청 보내기 API
  };

  const scan = () => {
    // TODO: expo-camera 로 QR 스캔 → 프로필 QR(친구추가 링크) 읽기
    notify('QR로 친구 추가', '카메라 스캔은 준비 중이에요.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="친구 추가" />

      <View style={styles.search}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>사용자 검색</Text>
          <Text style={styles.myId}>내 ID: {mockMe.id}</Text>
        </View>
        <View style={styles.field}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="아이디를 입력해주세요."
            placeholderTextColor="#404446"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          <Pressable onPress={scan} hitSlop={8} accessibilityLabel="QR 스캔" style={styles.scan}>
            <Image source={Icons.scan} style={styles.scanIcon} contentFit="contain" />
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{searching ? '검색 결과' : '친구 요청'}</Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {searching
          ? results.map((user) => (
              <PersonRow key={user.id} name={user.name} emotion={user.emotion}>
                {user.status !== 'friend' && (
                  <Pressable
                    onPress={() => sendRequest(user)}
                    disabled={user.status === 'requested'}
                    hitSlop={8}
                    accessibilityLabel={
                      user.status === 'requested' ? '요청 보냄' : `${user.name}님에게 친구 요청`
                    }
                    style={[styles.addUser, user.status === 'requested' && styles.dim]}
                  >
                    <Image
                      source={Icons.userAddWhite}
                      style={styles.addIcon}
                      contentFit="contain"
                    />
                  </Pressable>
                )}
              </PersonRow>
            ))
          : requests.map((req) => (
              <PersonRow
                key={req.id}
                name={req.name}
                emotion={req.emotion}
                bleed={25}
                orbCenterX={60}
                nameX={100}
              >
                <Pressable
                  onPress={() => answer(req, true)}
                  hitSlop={4}
                  accessibilityLabel="수락"
                  style={styles.accept}
                >
                  <Image source={Icons.circlePlus} style={styles.circle} contentFit="contain" />
                </Pressable>
                <Pressable
                  onPress={() => answer(req, false)}
                  hitSlop={4}
                  accessibilityLabel="거절"
                  style={styles.reject}
                >
                  <Image source={Icons.circleX} style={styles.circle} contentFit="contain" />
                </Pressable>
              </PersonRow>
            ))}

        {searching && results.length === 0 && (
          <Text style={styles.empty}>찾는 아이디가 없어요.</Text>
        )}
        {!searching && requests.length === 0 && (
          <Text style={styles.empty}>받은 친구 요청이 없어요.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  search: { marginTop: 22, paddingHorizontal: 37 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 18, color: Colors.white },
  myId: { marginRight: -4, fontFamily: Fonts.medium, fontSize: 13.3, color: Colors.textMuted },
  field: {
    ...NeuCard,
    marginTop: 18,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingLeft: 16,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  scan: { marginRight: 11 },
  scanIcon: { width: 33, height: 33 },
  sectionLabel: {
    marginTop: 26,
    marginLeft: 38,
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#808B9F',
  },
  list: { flex: 1, marginTop: 6, overflow: 'visible' },
  listContent: {
    paddingTop: 8,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 60,
    gap: 21.7,
  },
  // 위치는 PersonRow 안쪽 좌표 (bleed 포함)
  addUser: { position: 'absolute', left: 20 + 326 },
  addIcon: { width: 30, height: 30 },
  dim: { opacity: 0.3 },
  accept: { position: 'absolute', left: 25 + 294.7 },
  reject: { position: 'absolute', left: 25 + 336.4 },
  circle: { width: 41.5, height: 41.5 },
  empty: {
    marginTop: 24,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
