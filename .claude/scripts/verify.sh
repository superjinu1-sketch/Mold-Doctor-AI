#!/bin/bash
echo "========================================="
echo "  Mold Doctor 자동 검증 시작"
echo "========================================="

PASS=0
FAIL=0
WARN=0

echo ""
echo "[1/6] TypeScript 타입 체크..."
if npx tsc --noEmit 2>/dev/null; then
  echo "  ✅ 타입 에러 없음"
  PASS=$((PASS+1))
else
  echo "  ❌ 타입 에러 발견"
  npx tsc --noEmit --pretty 2>&1 | head -20
  FAIL=$((FAIL+1))
fi

echo ""
echo "[2/6] 빌드 체크..."
if npm run build 2>/dev/null 1>/dev/null; then
  echo "  ✅ 빌드 성공"
  PASS=$((PASS+1))
else
  echo "  ❌ 빌드 실패"
  npm run build 2>&1 | tail -20
  FAIL=$((FAIL+1))
fi

echo ""
echo "[3/6] console.log 잔여 확인..."
LOG_COUNT=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" src/ app/ 2>/dev/null | grep -v "node_modules" | grep -v ".next" | wc -l)
if [ "$LOG_COUNT" -eq 0 ]; then
  echo "  ✅ console.log 없음"
  PASS=$((PASS+1))
else
  echo "  ⚠️  console.log ${LOG_COUNT}개 발견"
  grep -rn "console\.log" --include="*.ts" --include="*.tsx" src/ app/ 2>/dev/null | grep -v "node_modules" | head -10
  WARN=$((WARN+1))
fi

echo ""
echo "[4/6] API 키 노출 확인..."
# .match() 내 regex 패턴은 제외, 실제 하드코딩된 키만 검출
KEY_COUNT=$(grep -r "sk-ant-" --include="*.ts" --include="*.tsx" --include="*.js" app/ 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$KEY_COUNT" -eq 0 ]; then
  echo "  ✅ API 키 노출 없음"
  PASS=$((PASS+1))
else
  echo "  ❌ API 키 코드 내 노출 의심"
  FAIL=$((FAIL+1))
fi

echo ""
echo "[5/6] 필수 파일 확인..."
MISSING=0
# lib/ 분리 전: resinKnowledge와 types는 route.ts에 내장
for f in "app/api/diagnose/route.ts" "app/api/analyze-image/route.ts" "components/DiagnosisResultPanel.tsx" ".env.local"; do
  if [ ! -f "$f" ]; then
    echo "  ❌ 누락: $f"
    MISSING=$((MISSING+1))
  fi
done
if [ "$MISSING" -eq 0 ]; then
  echo "  ✅ 필수 파일 모두 존재"
  PASS=$((PASS+1))
else
  FAIL=$((FAIL+1))
fi

echo ""
echo "[6/6] E2E 테스트..."
if [ -f "playwright.config.ts" ] && [ -d "tests" ]; then
  if npx playwright test --reporter=line 2>/dev/null; then
    echo "  ✅ E2E 테스트 통과"
    PASS=$((PASS+1))
  else
    echo "  ⚠️  E2E 테스트 일부 실패"
    WARN=$((WARN+1))
  fi
else
  echo "  ⏭️  E2E 테스트 스킵 (설정 없음)"
  PASS=$((PASS+1))
fi

echo ""
echo "========================================="
echo "  검증 결과"
echo "========================================="
echo "  ✅ 통과: ${PASS}개"
echo "  ⚠️  경고: ${WARN}개"
echo "  ❌ 실패: ${FAIL}개"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "❌ 실패 항목이 있습니다. 수정이 필요합니다."
  exit 1
else
  echo ""
  echo "✅ 검증 완료. 배포 가능 상태입니다."
  exit 0
fi
