// 이미지·아이콘 모음 (파일은 scripts/fetch-figma-assets.sh 로 받음)
export const Orbs = {
  group: require('@/assets/images/orbs/orb-group.png'),
  mine: require('@/assets/images/orbs/orb-mine.png'),
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
};

export const Images = {
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
