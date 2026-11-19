# FE 연동 현황

기준: 백엔드 `docs/API.md` v0.3 + 기획 결정(11/16). 기획 결정으로 바뀌는 부분은 지섭님께 아래 모양으로 제안했고,
서버가 올라오면 실제 모양과 다시 맞춰요.

## 기획 결정(11/16)으로 바뀐 것

| 항목 | FE가 보내는 모양 (제안) |
|---|---|
| 감정: 단어 선택 없음, 색 단위 | `POST /orbs {"colors":["BLUE","GREEN"], "soundId":"sample_blue"}` → 색에 매핑된 단어 4개를 서버가 저장 |
| 음악: 15초 샘플, AI 생성은 나중에 | `GET /catalog/sounds` → `[{id, title, color, durationMs, playbackUrl}]` |
| 19세: 가입 때 생년월일 | `POST /auth/signup {loginId, password, birthDate:"2001-05-19"}` |
| 19세: 기존 가입자 | 익명 처음 켤 때 `PUT /me/birth-date {birthDate}` → `Me.adultStatus` |

## v0.3 그대로 쓰는 것

친구 1명 전송(`friendId`), 받은 사람별 취소, 반응 3개(code), 신고 사유 4개, 익명 차단,
cursor 끝까지 읽기, 케어 notice·확인, 아이디 중복 확인, 토큰 갱신

## 아직 안 한 것

- 푸시 기기 등록: 유료 애플 계정이 있어야 해서 보류 (앱 안 알림으로 대체)
- 케어 안내 최종 문구: 기획 문구 받으면 교체

## 테스트

- 가짜 서버: `python3 scripts/fake-server.py` → `.env` 에 `EXPO_PUBLIC_API_URL=http://<맥 IP>:8200/api/v1`
- 앱 안에서 서버 바꾸기: 설정 → '도움과 소리' 제목을 2초 길게 누르기 (주소 입력 / 목업 / 기본값)
- 샘플 음악 7곡: `assets/sounds/sample-*.m4a` (15초, 코드로 합성해서 저작권 없음). 백엔드에도 같은 파일 전달
