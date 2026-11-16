import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toApiError } from '@/api/client';
import { friendLink, me as meApi, records } from '@/api/emori';
import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import QRCode from '@/components/QRCode';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Icons } from '@/constants/assets';
import { Colors, NeuCard } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { useApi } from '@/hooks/useApi';
import { mockMe } from '@/mocks/me';
import { notify } from '@/utils/dialog';

const ORB = 152; // 링 149
const ORB_VISIBLE = 132; // 피그마 '프로필' 구슬 지름
const QR_BOX = 283;

// 햄버거 > 프로필 (피그마 '프로필')
// - 내 구슬 / 이름(✎ 수정) / ID(복사) / 친구추가용 QR
export default function ProfileScreen() {
  // 내 정보 (GET /me): 이름 + 친구 코드(= 프로필 ID, QR)
  const profile = useApi(() => meApi.get(), []);
  const friendCode = profile.data?.friendCode ?? '';
  const [nameDraft, setName] = useState<string>();
  const name = nameDraft ?? profile.data?.name ?? '';
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  // 프로필 구슬 = 이번 주 내 대표 감정 (기록 없으면 목업 색)
  const mine = useApi(() => records('mine'), []);
  const emotion = getEmotion(mine.data?.topThisWeek ?? mockMe.emotion);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const saveName = () => {
    setEditing(false);
    if (!name.trim() || name === profile.data?.name) return;
    meApi.rename(name.trim()).catch((e) => {
      setName(undefined); // 실패하면 서버 이름으로 되돌림
      notify('이름을 바꾸지 못했어요', toApiError(e).message);
    });
  };

  const copyId = async () => {
    await Clipboard.setStringAsync(friendCode);
    setCopied(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="프로필" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 피그마 좌표 그대로 (393pt 기준) */}
        <View style={styles.canvas}>
          <View style={styles.orb}>
            <EmotionOrb
              source={emotion.image}
              size={ORB}
              ringColor="#2A2416"
              glowColor="#D8E35A"
              shadowColor="#2B2A0A"
              imageStyle={orbImageStyle(emotion.key, ORB_VISIBLE)}
            />
          </View>

          <View style={[styles.card, styles.nameCard]}>
            {editing ? (
              <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={saveName}
                onBlur={saveName}
                autoFocus
                maxLength={6}
                returnKeyType="done"
                style={[styles.name, styles.nameInput]}
              />
            ) : (
              <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                {name}
              </Text>
            )}
            <Pressable
              onPress={() => setEditing(true)}
              hitSlop={10}
              accessibilityLabel="이름 수정"
              style={styles.editButton}
            >
              <Image source={Icons.edit} style={styles.editIcon} contentFit="contain" />
            </Pressable>
          </View>

          <Pressable
            onPress={copyId}
            accessibilityLabel="아이디 복사"
            style={({ pressed }) => [styles.card, styles.idCard, pressed && styles.pressed]}
          >
            <Text style={styles.idText}>ID: {friendCode}</Text>
            <Image source={Icons.copy} style={styles.copyIcon} contentFit="contain" />
          </Pressable>

          <View style={[styles.card, styles.qrCard]}>
            <QRCode value={friendLink(friendCode)} size={QR_BOX - 26} />
            {copied && (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(250)}
                style={styles.copied}
              >
                <Image source={Icons.check} style={styles.checkIcon} contentFit="contain" />
                <Text style={styles.copiedText}>아이디를 복사했어요</Text>
              </Animated.View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    alignItems: 'center',
    paddingTop: 46,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 40,
  },
  canvas: { width: 393, height: 510 },
  orb: { position: 'absolute', left: 51, top: 0 },
  card: { position: 'absolute', ...NeuCard },
  nameCard: {
    left: 230,
    top: 24,
    minWidth: 100, // 피그마 100 (이름 2글자). 아이디가 길면 오른쪽 끝까지 늘어남
    maxWidth: 393 - 230 - 12,
    height: 53,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
  },
  name: {
    minWidth: 52,
    maxWidth: 393 - 230 - 12 - 11 - 48, // 카드 최대 - 왼쪽 여백 - ✎ 자리
    fontFamily: Fonts.regular,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.white,
  },
  nameInput: { padding: 0 },
  editButton: { marginRight: 11 }, // 이름 바로 오른쪽 (피그마: 이름 52 + ✎ 26 → 카드 100)
  editIcon: { width: 26, height: 28 },
  idCard: {
    left: 225,
    top: 93,
    width: 109,
    height: 34,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
  },
  idText: { fontFamily: Fonts.medium, fontSize: 12.4, color: Colors.textActive },
  copyIcon: { position: 'absolute', left: 80, top: 9, width: 15.5, height: 15.5 },
  pressed: { opacity: 0.7 },
  qrCard: {
    left: 55,
    top: 188,
    width: QR_BOX,
    height: QR_BOX,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copied: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    backgroundColor: 'rgba(21,21,21,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  checkIcon: { width: 124, height: 124 },
  copiedText: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textPrimary },
});
