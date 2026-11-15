// 홈 화면 위젯 (iOS) - 탭하면 앱의 '감정 보내기' 화면이 열림
// 바뀐 기획: 위젯 → 인 앱 → 감정 보내기 (위젯 안에서 보내기까지 하지 않음)
// 빌드: npx expo prebuild -p ios → npx expo run:ios --device --configuration Release (Expo Go 에서는 안 보임)
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'EmOriWidget',
  deploymentTarget: '17.0',
  colors: {
    $widgetBackground: '#151515',
    $accent: '#83DBD6',
  },
  images: {
    orb: '../../assets/images/orbs/orb-group.png',
    orbMine: '../../assets/images/orbs/mine/blue.png', // 피그마 '위잿' 내 감정 상태
    orbReceived: '../../assets/images/orbs/mine/pink.png', // 피그마 '감정 받음' 상태
  },
};
