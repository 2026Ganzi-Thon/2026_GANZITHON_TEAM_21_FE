import { Alert, Platform } from 'react-native';

// 알림창 / 확인창 (앱 + 웹 공용)
// React Native 의 Alert 는 웹에서 아무것도 안 떠서, 웹은 브라우저 기본 창을 씀

const join = (title: string, message?: string) => (message ? `${title}\n\n${message}` : title);

// 안내만 하는 창 (확인 버튼 하나)
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(join(title, message));
    return;
  }
  Alert.alert(title, message);
}

// 취소 / 확인 두 버튼 창. 확인을 누르면 onOk 실행
export function confirm({
  title,
  message,
  okText = '확인',
  destructive = false,
  onOk,
}: {
  title: string;
  message?: string;
  okText?: string;
  destructive?: boolean;
  onOk: () => void;
}) {
  if (Platform.OS === 'web') {
    if (window.confirm(join(title, message))) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: okText, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}
