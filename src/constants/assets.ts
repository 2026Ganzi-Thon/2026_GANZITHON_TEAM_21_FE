// 이미지·아이콘 모음 (파일은 scripts/fetch-figma-assets.sh 로 받음)
export const Orbs = {
  group: require('@/assets/images/orbs/orb-group.png'),
  mono: require('@/assets/images/orbs/orb-mono.png'),
  monoDim: require('@/assets/images/orbs/orb-mono-dim.png'),
  yellow: require('@/assets/images/orbs/orb-yellow.png'),
  orange: require('@/assets/images/orbs/orb-orange.png'),
  red: require('@/assets/images/orbs/orb-red.png'),
  pink: require('@/assets/images/orbs/orb-pink.png'),
  purple: require('@/assets/images/orbs/orb-purple.png'),
  blue: require('@/assets/images/orbs/orb-blue.png'),
  green: require('@/assets/images/orbs/orb-green.png'),
};

// 디자인 최종 에셋 (2026-11-14). 모든 구슬 이미지는 '구슬 지름 = 이미지의 85%, 정가운데'로 맞춰 둠

// 내 감정 메인 구슬: 이번 주에 가장 많이 고른 감정 색 (디자인 파스텔 6종, 빨강은 없어서 분홍으로 대체)
export const MineOrbs = {
  green: require('@/assets/images/orbs/mine/green.png'),
  yellow: require('@/assets/images/orbs/mine/yellow.png'),
  orange: require('@/assets/images/orbs/mine/orange.png'),
  pink: require('@/assets/images/orbs/mine/pink.png'),
  purple: require('@/assets/images/orbs/mine/purple.png'),
  blue: require('@/assets/images/orbs/mine/blue.png'),
};

// 두 감정을 섞은 구슬 21종 (키: 알파벳순 'a-b'). 해상도가 작아서(약 270px) 작은 화면에만 사용
export const MixOrbs: Record<string, number> = {
  'blue-green': require('@/assets/images/orbs/mix/blue-green.png'),
  'blue-orange': require('@/assets/images/orbs/mix/blue-orange.png'),
  'blue-pink': require('@/assets/images/orbs/mix/blue-pink.png'),
  'blue-purple': require('@/assets/images/orbs/mix/blue-purple.png'),
  'blue-red': require('@/assets/images/orbs/mix/blue-red.png'),
  'blue-yellow': require('@/assets/images/orbs/mix/blue-yellow.png'),
  'green-orange': require('@/assets/images/orbs/mix/green-orange.png'),
  'green-pink': require('@/assets/images/orbs/mix/green-pink.png'),
  'green-purple': require('@/assets/images/orbs/mix/green-purple.png'),
  'green-red': require('@/assets/images/orbs/mix/green-red.png'),
  'green-yellow': require('@/assets/images/orbs/mix/green-yellow.png'),
  'orange-pink': require('@/assets/images/orbs/mix/orange-pink.png'),
  'orange-purple': require('@/assets/images/orbs/mix/orange-purple.png'),
  'orange-red': require('@/assets/images/orbs/mix/orange-red.png'),
  'orange-yellow': require('@/assets/images/orbs/mix/orange-yellow.png'),
  'pink-purple': require('@/assets/images/orbs/mix/pink-purple.png'),
  'pink-red': require('@/assets/images/orbs/mix/pink-red.png'),
  'pink-yellow': require('@/assets/images/orbs/mix/pink-yellow.png'),
  'purple-red': require('@/assets/images/orbs/mix/purple-red.png'),
  'purple-yellow': require('@/assets/images/orbs/mix/purple-yellow.png'),
  'red-yellow': require('@/assets/images/orbs/mix/red-yellow.png'),
};

export const Icons = {
  menu: require('@/assets/icons/menu.svg'),
  userAdd: require('@/assets/icons/user-add.svg'),
  settings: require('@/assets/icons/settings.svg'),
  chevronDown: require('@/assets/icons/chevron-down.svg'),
  heart: require('@/assets/icons/heart.svg'),
  clock: require('@/assets/icons/clock.svg'),
  plus: require('@/assets/icons/plus.svg'),
  wheelTrack: require('@/assets/icons/wheel-track.svg'),
  back: require('@/assets/icons/back.svg'),
  close: require('@/assets/icons/close.svg'),
  radioOn: require('@/assets/icons/radio-on.svg'),
  radioOff: require('@/assets/icons/radio-off.svg'),
  check: require('@/assets/icons/check-circle.svg'),
  headphones: require('@/assets/icons/headphones.svg'),
  // 햄버거 메뉴
  menuPressed: require('@/assets/icons/menu-pressed.svg'),
  user: require('@/assets/icons/user.svg'),
  userGroup: require('@/assets/icons/user-group.svg'),
  creditCard: require('@/assets/icons/credit-card.svg'),
  settingsMenu: require('@/assets/icons/settings-menu.svg'),
  // 프로필 / 소셜 목록 / 설정
  copy: require('@/assets/icons/copy.svg'),
  edit: require('@/assets/icons/edit.svg'),
  heartOutline: require('@/assets/icons/heart-outline.svg'),
  xRed: require('@/assets/icons/x-red.svg'),
  chevronLeft: require('@/assets/icons/chevron-left.svg'), // 설정 화면에서는 좌우 반전해서 ›
  // 친구 추가
  circlePlus: require('@/assets/icons/circle-plus.svg'),
  circleX: require('@/assets/icons/circle-x.svg'),
  scan: require('@/assets/icons/scan.svg'),
  userAddWhite: require('@/assets/icons/user-add-white.svg'),
  // 로그인 / 회원가입 (간편 로그인)
  naver: require('@/assets/icons/naver.svg'),
  google: require('@/assets/icons/google.png'),
  phone: require('@/assets/icons/phone.svg'),
};

export const Images = {
  // 알림 배너 왼쪽 EO 앱 아이콘
  appIcon: require('@/assets/images/app-icon.png'),
  // EmOri 로고 (피그마 전용 폰트라 이미지로 사용)
  logo: require('@/assets/images/logo-emori.png'),
  // 커버·로그인 배경 장식 구슬
  decoPink: require('@/assets/images/orbs/deco-pink.png'),
  decoGreen: require('@/assets/images/orbs/deco-green.png'),
  decoPurple: require('@/assets/images/orbs/deco-purple.png'),
  decoGray: require('@/assets/images/orbs/deco-gray.png'),
  // 흰색 방사형 그라데이션 - tintColor 로 감정 색을 입혀서 글로우로 사용
  glow: require('@/assets/images/glow.png'),
};

// 임시 음악 (무보컬 12초). 실제 음원 받으면 교체
export const Sounds = {
  calm01: require('@/assets/sounds/calm-01.wav'),
};

export const Avatars = {
  a1: require('@/assets/images/avatars/avatar-1.png'),
  a2: require('@/assets/images/avatars/avatar-2.png'),
};
