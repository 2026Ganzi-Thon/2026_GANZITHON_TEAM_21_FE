// SVG 파일을 이미지 에셋으로 불러오기 위한 설정 (expo-image 가 SVG 렌더링)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('svg')) {
  config.resolver.assetExts.push('svg');
}

module.exports = config;
