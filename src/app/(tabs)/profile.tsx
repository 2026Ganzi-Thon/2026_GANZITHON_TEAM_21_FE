import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import QRCode from '@/components/QRCode';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/components/TabBar';
import { Icons } from '@/constants/assets';
import { Colors, NeuCard } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { mockMe } from '@/mocks/me';

const ORB = 152;
const QR_BOX = 283;

// 햄버거 > 프로필 (피그마 '프로필')
// - 내 구슬 / 이름(✎ 수정) / ID(복사) / 친구추가용 QR
export default function ProfileScreen() {
  const [name, setName] = useState(mockMe.name);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const emotion = getEmotion(mockMe.emotion);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const saveName = () => {
    setEditing(false);
    // TODO: 이름 수정 API
  };

  const copyId = async () => {
    await Clipboard.setStringAsync(mockMe.id);
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
              imageStyle={orbImageStyle(emotion.key, ORB * 0.93)}
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
            <Text style={styles.idText}>ID: {mockMe.id}</Text>
            <Image source={Icons.copy} style={styles.copyIcon} contentFit="contain" />
          </Pressable>

          <View style={[styles.card, styles.qrCard]}>
            <QRCode value={mockMe.friendLink} size={QR_BOX - 26} />
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
    paddingTop: 38,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 40,
  },
  canvas: { width: 393, height: 510 },
  orb: { position: 'absolute', left: 51, top: 0 },
  card: { position: 'absolute', ...NeuCard },
  nameCard: {
    left: 230,
    top: 24,
    width: 100,
    height: 53,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
  },
  name: {
    width: 52,
    fontFamily: Fonts.regular,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.white,
  },
  nameInput: { padding: 0 },
  editButton: { position: 'absolute', left: 63, top: 12 },
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
