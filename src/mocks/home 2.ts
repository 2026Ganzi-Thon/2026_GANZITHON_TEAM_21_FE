// 가짜 데이터 - 백엔드 연동 시 src/api 호출로 교체
import { Orbs } from '@/constants/assets';

export const mockHome = {
  groupName: '그룹',
  weekLabel: '10월 1주',
  latestSender: '서현',
  // 페이지 점(●○○) 개수 = 그룹 수
  pageCount: 5,
  orbImage: Orbs.group,
};
