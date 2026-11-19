import AsyncStorage from '@react-native-async-storage/async-storage';

// 로그인 토큰 보관 (API 명세 §2 Session = { accessToken, refreshToken, expiresIn })
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const EXPIRES_KEY = 'accessExpiresAt'; // access 토큰 만료 시각 (ms)

export const getAccessToken = () => AsyncStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => AsyncStorage.getItem(REFRESH_KEY);
export async function getAccessExpiresAt() {
  const v = await AsyncStorage.getItem(EXPIRES_KEY);
  return v ? Number(v) : null;
}

export async function saveTokens(
  accessToken: string,
  refreshToken?: string | null,
  expiresIn?: number, // 초
) {
  await AsyncStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  if (expiresIn) await AsyncStorage.setItem(EXPIRES_KEY, String(Date.now() + expiresIn * 1000));
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, EXPIRES_KEY]);
}
