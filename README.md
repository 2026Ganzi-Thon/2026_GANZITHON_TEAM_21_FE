# 2026 GANZITHON TEAM 21 — Frontend

React Native (Expo SDK 58) + TypeScript + Expo Router

## 시작하기

```bash
git clone https://github.com/2026Ganzi-Thon/2026_GANZITHON_TEAM_21_FE.git
cd 2026_GANZITHON_TEAM_21_FE
npm install
cp .env.example .env   # 백엔드 주소 넣기
npx expo start         # 폰에 Expo Go 설치 후 QR 스캔 / i: iOS 시뮬레이터 / w: 웹
```

> 패키지 추가는 `npm install` 말고 **`npx expo install <패키지>`** (SDK 버전에 맞춰줌)

## 폴더 구조

```
src/
├── app/          # 화면(라우트). 파일 하나 = 화면 하나. _layout.tsx = 네비게이터
├── components/   # 재사용 컴포넌트
├── api/          # axios 인스턴스(client.ts) + 도메인별 API 함수
├── hooks/        # 커스텀 훅
├── stores/       # 전역 상태
├── constants/    # 색상·폰트 등 디자인 토큰
├── types/        # 공용 타입 (API 응답 타입 등)
└── utils/        # 유틸 함수
```

- import는 `@/` 경로 별칭 사용 → `import { api } from '@/api/client'`
- 색상은 하드코딩하지 말고 `@/constants/colors`에서 가져오기

## 스크립트

| 명령                | 설명          |
| ------------------- | ------------- |
| `npm start`         | 개발 서버     |
| `npm run lint`      | ESLint        |
| `npm run format`    | Prettier 포맷 |
| `npm run typecheck` | 타입 체크     |

## 협업 규칙

- 브랜치: `main`(배포) ← `dev`(통합) ← `feat/기능명`, `fix/버그명`
- 작업 후 `dev`로 PR → 다른 프론트 팀원이 리뷰 후 머지
- 커밋 메시지: `feat:` 기능 / `fix:` 버그 / `style:` UI·스타일 / `refactor:` / `chore:` 설정
- PR 전에 `npm run lint && npm run typecheck`
