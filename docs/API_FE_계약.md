# EmOri FE ↔ BE 연동 계약 (FE 기준)

API 명세 0.1을 기준으로 FE가 실제로 부르는 요청과 응답을 정리했어요.
PRD v1.4와 팀 결정 때문에 명세와 다른 부분은 **★** 로 표시했어요.

- 앱 코드: `src/api/emori.ts` 한 파일에 모든 호출이 있어요. 경로나 필드가 바뀌면 여기만 고치면 돼요.
- 테스트용 가짜 서버: `scripts/fake-server.py`. 이 문서대로 동작해요.

## 공통

- 기본 경로는 `/api/v1`이고, JSON은 camelCase로 써요.
- 인증 헤더는 `Authorization: Bearer <accessToken>`이에요.
- 401이 오면 `POST /auth/refresh {refreshToken}`를 한 번 시도해요. 실패하면 로그인 화면으로 보내요.
- ★ 표시 요청에는 `Idempotency-Key`(UUID) 헤더를 붙여요. 사용자가 누를 때마다 새 키를 만들어요.
- 오류 응답은 `{ "error": { "code", "message", "field?", "retryAt?" } }` 모양이에요. FE는 `code`로 분기하고, 모르는 코드면 `message`를 그대로 보여줘요.
- **Expo 앱은 CORS와 상관없어요.** 웹으로 띄울 때만 CORS 허용 헤더에 `Authorization`이 필요해요.

## ★ 명세 0.1과 다른 점 (꼭 맞춰주세요)

| # | 내용 | 이유 |
|---|---|---|
| 1 | 로그인·가입은 `{ loginId, password }`예요. 이메일이 아니에요. | 지섭님 결정 (11/15) |
| 2 | 가입할 때 `nickname`도 같이 보내요. 값은 loginId와 같아요. | 닉네임 단계가 없어서요 |
| 3 | **감정은 색(구슬) 단위**예요. `POST /orbs {colors:["BLUE","PURPLE"], soundId}` 형태로 보내요. | PRD 3-1: 단어를 따로 고르지 않아요 |
| 4 | `Emotion = { color, area, words[4] }`예요. 단어 4개는 서버가 매핑해서 채워줘요. | PRD 3-2 |
| 5 | 친구에게 보내기는 `friendIds: [..]` 배열이에요. 1명이어도 배열로 보내요. | 앱에서 여러 명을 고를 수 있어요 |
| 6 | `GET /inbox`의 각 항목에 `orb`도 넣어주세요. | 수신함 목록에서 구슬을 보여줘야 해요 |
| 7 | `Record`에 `counterpart: {id,nickname} \| null`을 넣어주세요. 받은 기록은 보낸 사람, 보낸 기록은 받은 사람이에요. 받는 사람이 여러 명이거나 익명이면 null이에요. | 기록장 '보낸이 / 받은이' 칸에 써요 |
| 8 | 학교 인증과 19세 인증 화면은 아직 없어요. 익명을 켤 때 `403 AGE_REQUIRED`가 오면 안내만 해요. | PRD에 확인 방법이 정해지지 않았어요 |

## 요청 목록

### 로그인 (§2)
| 요청 | 보내는 값 | 받는 값 (FE가 쓰는 필드) | FE가 쓰는 오류 |
|---|---|---|---|
| POST /auth/signup | `{loginId, password, nickname}` | `{session:{accessToken, refreshToken}}` | 409 이미 쓰는 아이디, 422 |
| POST /auth/login | `{loginId, password}` | `{session:{accessToken, refreshToken}}` | 401 |
| POST /auth/refresh | `{refreshToken}` | `{accessToken, refreshToken}` | 401이면 로그아웃 |
| POST /auth/logout | `{}` | — | 무시 |
| GET /me | — | `{nickname, friendCode, adultStatus}` | — |
| PUT /me/profile | `{nickname}` | — | — |

### 카탈로그 (§3)
| 요청 | 받는 값 |
|---|---|
| GET /catalog/sounds | `{items:[{id, title, durationMs, playbackUrl}]}`: 15초 이내, 가사 없는 소리 |
| GET /catalog/reactions | `{items:[{code, label, emoji}]}`: 반응을 보낼 때 emoji를 code로 바꿔요 |

### 보내기 (§3)
| 요청 | 보내는 값 | 받는 값 | 오류 |
|---|---|---|---|
| ★ POST /orbs | `{colors:[1~2개], soundId \| null}` | `{orb:{id}, recordId}` | 422 |
| ★ POST /orbs/{orbId}/dispatches | 아래 3가지 중 하나: `{route:"SELF"}`, `{route:"FRIEND", friendIds:[..]}`, `{route:"ANONYMOUS"}` | `{id, cancelUntil}` | 409 NO_MATCH · FRIENDSHIP_CHANGED, 429 ANON_SEND_LIMIT, 403 AGE_REQUIRED · ANONYMOUS_DISABLED |
| ★ POST /dispatches/{id}/cancel | `{}` | — | 409 CANCEL_NOT_ALLOWED |

### 받은 감정 (§4)
| 요청 | 보내는 값 | 받는 값 | 오류 |
|---|---|---|---|
| GET /inbox?limit=50 | — | `{items:[{id, route, sender, receivedAt, openedAt, orb}]}` | — |
| ★ POST /receipts/{id}/open | `{}` | `SingleView {receipt, orb, mode, actions, actionToken}` | 404면 "확인할 수 없는 구슬" |
| GET /receipts/{id}/replay | — | `SingleView` (actions는 빈 배열) | — |
| ★ POST /receipts/{id}/reaction | `{actionToken, code}` | — | 409 ACTION_CLOSED |
| POST /receipts/{id}/finish | `{actionToken}` | 204 | 무시 |
| ★ POST /receipts/{id}/reports | `{reasonCode:"OTHER"}` | — | 409 ALREADY_REPORTED |

- **finish를 보내는 때:** 사용자가 '조용히 듣기'를 누르거나, 반응 없이 화면을 나갈 때 보내요.
- **open과 replay 구분:** 기록장에서 다시 들어오거나 이미 연 구슬은 replay를 쓰고, 나머지는 open을 써요. open을 두 번째로 부르면 mode가 REPLAY로 와야 해요.

### 기록 (§4)
| 요청 | 받는 값 |
|---|---|
| GET /records?side=OWN&limit=100 (내 감정) / GET /records?limit=100 (전체 감정) | `{items:[{id, side, orb, route, recordedAt, receiptId, counterpart}]}`, 최신순 |
| DELETE /records/{id} | 204. 내 기록만 지워요 (받은 기록은 403) |

- FE가 최근 12주(월요일 시작)로 묶어서 기록장을 그려요.
- 이번 주 가장 많이 고른 색이 '내 감정' 구슬과 프로필 구슬이 돼요.

### 친구 (§2)
| 요청 | 보내는 값 | 받는 값 |
|---|---|---|
| GET /friends?limit=100 | — | `{items:[{id, nickname}]}` |
| DELETE /friends/{id} | — | 204 |
| GET /friend-requests?direction=INCOMING | — | `{items:[{id, from:{nickname}, status}]}`. PENDING만 보여줘요 |
| POST /friend-requests | `{friendCode}` (= 상대 아이디) | 409 RELATION_EXISTS, 404·422면 "없는 아이디" |
| PUT /friend-requests/{id}/decision | `{decision:"ACCEPT" \| "DECLINE"}` | — |

- 사용자 검색 API는 명세에 없어서, 입력한 아이디로 바로 요청을 보내요.
- QR에는 `ganzithon21://friend/{friendCode}`가 들어가요.

### 설정·휴식·케어 (§5)
| 요청 | 보내는 값 | 받는 값 |
|---|---|---|
| GET /me/settings | — | `{anonymousEnabled, pushEnabled, rest:{mode, startsAt, endsAt}}` |
| PATCH /me/settings | `{anonymousEnabled}` 또는 `{pushEnabled}` | 403 AGE_REQUIRED |
| PUT /me/rest | `{mode:"OFF"}` / `{mode:"MANUAL"}` / `{mode:"SCHEDULED", startsAt, endsAt}` | — |
| GET /me/care | — | `{level: 0 \| 1 \| 2}` |

- 휴식 예약은 날짜 단위예요. 시작일 00:00(KST)부터, 마지막 날 다음 날 00:00까지 보내요. 종료 시각은 포함하지 않아요.

## 아직 FE에 없는 것

- **푸시 토큰 등록:** `PUT /me/devices/{installationId}`는 expo-notifications 연동 후에 붙여요. 지금은 앱이 켜져 있는 동안 15초마다 수신함을 확인해서, 앱 안 배너로 새 구슬을 알려줘요.
- **기록 상세:** `GET /records/{id}`(반응 합계)는 아직 안 써요. 기록장 반응 칸은 비어 있어요.
- **그룹:** PRD 8-3에서 후속 기능이라 만들지 않았어요.

## 연동 테스트 순서

1. 서버를 띄우고 같은 와이파이에서 맥 IP를 확인해요. 예: `192.168.0.10`
2. 프로젝트 폴더에 `.env` 파일을 만들고 `EXPO_PUBLIC_API_URL=http://192.168.0.10:8080`을 넣어요.
3. `npx expo start -c`로 띄워요. `-c`를 붙여야 환경변수가 새로 반영돼요.
4. `.env`를 지우면 목업 모드로 돌아가요. 부스 시연용 안전장치예요.
