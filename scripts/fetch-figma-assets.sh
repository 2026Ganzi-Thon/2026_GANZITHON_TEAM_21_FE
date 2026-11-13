#!/bin/bash
# 피그마 에셋(구슬 이미지·아이콘) 다운로드 스크립트
# 사용법: 프로젝트 폴더에서  bash scripts/fetch-figma-assets.sh
# - 이미 있는 파일은 건너뜀
# ⚠️ 피그마 임시 URL이라 약 1주일 뒤 만료됨 → 받은 파일은 꼭 git에 커밋하기
cd "$(dirname "$0")/.."
BASE="https://www.figma.com/api/mcp/asset"
mkdir -p assets/images/orbs assets/images/avatars assets/icons

dl() {
  if [ -s "$1" ]; then echo "⏭  $1 (이미 있음)"; return; fi
  curl -sfL -o "$1" "$BASE/$2" && echo "✅ $1" || echo "❌ $1 (실패 - URL 만료 시 Claude한테 새로 받기)"
}

# ── 메인 화면 ──
dl assets/images/orbs/orb-group.png       64050f22-7e1b-4f0a-bb25-fe3a64bb93c4.png
dl assets/images/orbs/orb-mono.png        8f936db2-8d04-45c8-9989-f8f56622a657.png
dl assets/images/orbs/orb-mono-dim.png    9e845873-c8ff-4661-9927-e4edb8ff18b4.png
dl assets/icons/menu.svg                  5d73a263-6ad1-4b5a-b54e-603fa21393c3.svg
dl assets/icons/user-add.svg              d5128ccb-4f38-469a-9be0-692f78c3f4e7.svg
dl assets/icons/settings.svg              4cb4910a-c80d-4aaa-b0b4-2412cfd6d1f8.svg
dl assets/icons/chevron-down.svg          d2939fed-0afd-4934-a038-c19fc3f46567.svg
dl assets/icons/heart.svg                 6b8b31c1-a692-452e-8185-7429174bebf9.svg
dl assets/icons/clock.svg                 808b1abc-d3b5-430c-96c6-64f71c4d5bfb.svg

# ── 감정 보내기 (7색 구슬 + 휠) ──
dl assets/images/orbs/orb-yellow.png      ce9f9287-3ea2-4fc6-ba83-979c8ccbfcb9.png
dl assets/images/orbs/orb-orange.png      f786b128-4625-4b90-9f52-95b5361b3981.png
dl assets/images/orbs/orb-red.png         cbf39ee1-a531-49ef-bda0-41eac4755a59.png
dl assets/images/orbs/orb-pink.png        2f604c9d-0e19-4ba7-8b8c-beb3af1233d5.png
dl assets/images/orbs/orb-purple.png      0bea0a69-36a3-4646-bf2f-dd6202c66b99.png
dl assets/images/orbs/orb-blue.png        f61c3b6c-9d56-453b-bf03-76e7dc5cee47.png
dl assets/images/orbs/orb-green.png       7d6d0b01-c494-45c1-a8d5-4052896ee344.png
dl assets/icons/plus.svg                  0c1c99e2-0e0a-4d8e-a8dd-6c59f3d804b9.svg
dl assets/icons/wheel-track.svg           08363627-8d0a-4789-82d6-c36e9921c781.svg

# ── 공유자 선택 시트 ──
dl assets/icons/back.svg                  a590fd91-c571-4b64-ac03-9737fe2f1401.svg
dl assets/icons/close.svg                 443098f8-6eea-4ee0-b4df-10fbcb428417.svg
dl assets/icons/radio-on.svg              5f75906b-c777-44b3-a925-d503246c6d22.svg
dl assets/icons/radio-off.svg             51d4594c-ca78-4d1a-919c-aa78a34ad5c0.svg
dl assets/images/avatars/avatar-1.png     4387bcce-214f-4d6f-b162-e8aca6e2c79a.png
dl assets/images/avatars/avatar-2.png     decc094d-6c8c-48dd-aba4-59072b1759a4.png
