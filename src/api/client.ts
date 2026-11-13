import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const TOKEN_KEY = 'accessToken';

// 백엔드 주소는 .env 의 EXPO_PUBLIC_API_URL 에서 읽음
// eslint-disable-next-line import/no-named-as-default-member
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청마다 저장된 토큰을 Authorization 헤더에 붙임
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 에러 로그를 한 곳에서 확인
api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.warn('[API Error]', error.response?.status, error.config?.url, error.response?.data);
    return Promise.reject(error);
  },
);
