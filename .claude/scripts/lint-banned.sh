#!/usr/bin/env bash
# 금지어 lint — CLAUDE.md/AGENTS.md 규칙 기반
# 이식 출처: MoldIQ Project .claude/scripts/lint-banned.sh
TARGET="${1:-src}"

# 메타 파일(규칙 정의 위치)은 lint 대상 아님
case "$TARGET" in
  CLAUDE.md|./CLAUDE.md|AGENTS.md|./AGENTS.md|.claude/*|./.claude/*|*/CLAUDE.md|*/AGENTS.md|*/.claude/*)
    exit 0
    ;;
esac

# 금지어 목록 (AGENTS.md 규칙과 동기화)
BANNED=("100% 정확" "정확히 찾아" "SmartMoldIQ" "AI-MoldIQ" "Stryker" "Anthropic" "AI-진단" "AI-분석")
FAIL=0
for word in "${BANNED[@]}"; do
  HITS=$(grep -rn "$word" "$TARGET" \
    --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
    --exclude="CLAUDE.md" --exclude="AGENTS.md" \
    2>/dev/null)
  if [ -n "$HITS" ]; then
    echo "[BANNED] '$word'"
    echo "$HITS"
    FAIL=1
  fi
done

# "진단" — .tsx 사용자 노출 파일 한정 (route.ts 변수명은 제외)
# app/api/ 디렉토리는 제외하여 프롬프트 문자열 오탐 방지
TSX_BANNED=("진단")
for word in "${TSX_BANNED[@]}"; do
  HITS=$(grep -rn "$word" "$TARGET" \
    --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
    --exclude-dir=api \
    2>/dev/null)
  if [ -n "$HITS" ]; then
    echo "[BANNED-TSX] '$word' — .tsx 사용자 노출 파일에서 '추정'으로 교체 필요"
    echo "$HITS"
    FAIL=1
  fi
done
exit $FAIL
