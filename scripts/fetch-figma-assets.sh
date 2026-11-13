#!/bin/bash
# 피그마 에셋(구슬 이미지·아이콘) 다운로드 스크립트
# 사용법: 프로젝트 폴더에서  bash scripts/fetch-figma-assets.sh
# ⚠️ 피그마 임시 URL이라 2026-11-20쯤 만료됨. 만료되면 Claude한테 새 URL 받기
set -e
cd "$(dirname "$0")/.."
BASE="https://www.figma.com/api/mcp/asset"

dl() { curl -sfL -o "$1" "$BASE/$2" && echo "✅ $1" || echo "❌ $1 (실패)"; }

# 구슬 이미지
dl assets/images/orbs/orb-group.png       64050f22-7e1b-4f0a-bb25-fe3a64bb93c4.png
dl assets/images/orbs/orb-mono.png        8f936db2-8d04-45c8-9989-f8f56622a657.png
dl assets/images/orbs/orb-mono-dim.png    9e845873-c8ff-4661-9927-e4edb8ff18b4.png

# 아이콘 (SVG)
dl assets/icons/menu.svg          5d73a263-6ad1-4b5a-b54e-603fa21393c3.svg
dl assets/icons/user-add.svg      d5128ccb-4f38-469a-9be0-692f78c3f4e7.svg
dl assets/icons/settings.svg      4cb4910a-c80d-4aaa-b0b4-2412cfd6d1f8.svg
dl assets/icons/chevron-down.svg  d2939fed-0afd-4934-a038-c19fc3f46567.svg
dl assets/icons/heart.svg         6b8b31c1-a692-452e-8185-7429174bebf9.svg
dl assets/icons/clock.svg         808b1abc-d3b5-430c-96c6-64f71c4d5bfb.svg
