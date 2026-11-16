import AsyncStorage from '@react-native-async-storage/async-storage';

// 로그인 토큰 보관 (API 명세 0.1 §2 Session = { accessToken, refreshToken, expiresIn })
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const getAccessToken = () => AsyncStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => AsyncStorage.getItem(REFRESH_KEY);

export async function saveTokens(accessToken: string, refreshToken?: string | null) {
  await AsyncStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}
