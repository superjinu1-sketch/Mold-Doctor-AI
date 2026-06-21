# eval 실행 가이드 (billing 격리 필수)

> 배경: 2026-06-21 eval 5×5 도중 Anthropic 잔액이 소진되어 **프로덕션 진단(`/api/diagnose` 등)이 전부 400으로 다운**됐다.
> 원인 = eval과 prod가 같은 키·같은 잔액(SPOF). 재발 방지를 위해 eval은 **EVAL 전용 키 + 전용 dev 서버**로만 돌린다.

## 핵심 원칙
1. **EVAL 전용 키만 사용.** eval의 모든 Anthropic 호출은 `ANTHROPIC_API_KEY_EVAL`을 쓴다.
   - judge(Haiku) = `run.mjs`가 직접 호출 → `loadApiKey()`가 EVAL 키만 사용, **없으면 에러로 중단(prod 키 fallback 금지).**
   - diagnose(Sonnet) = **dev 서버가 호출** → 반드시 `npm run dev:eval`로 띄워야 EVAL 키로 격리됨. (일반 `npm run dev`는 prod 키 → eval에 쓰면 안 됨.)
2. **순차 실행만.** eval을 동시에 2개 이상 띄우지 말 것 (06-21 레이스로 캐시 오염 + API 400 발생). 한 번에 하나.
3. 진짜 잔액 방어선은 콘솔의 **워크스페이스 spend limit + auto-reload**다. 키 분리는 비용 가시성·한도 적용 수단.

## 사전 준비 (1회)
1. console.anthropic.com → **dev-eval 워크스페이스** 생성 → Limits에서 월 spend limit 설정 → 그 워크스페이스에서 **API 키 발급**.
2. `.env.local`에 추가 (이 파일은 `.gitignore`의 `.env*`로 커밋되지 않음):
   ```
   ANTHROPIC_API_KEY_EVAL=sk-ant-...   # dev-eval 워크스페이스 키
   ```
   `ANTHROPIC_API_KEY`(prod 키)는 그대로 둔다 — prod 라우트·Vercel 배포가 계속 사용.

## 실행
```bash
cd ~/Desktop/Project/jinsim-mac/mold-doctor

# 터미널 1 — eval 전용 dev 서버 (EVAL 키로 기동, prod 잔액과 격리)
npm run dev:eval            # → http://localhost:3000

# 터미널 2 — eval (judge도 EVAL 키)
npm run eval
```
- `dev:eval`/`eval` 둘 다 `ANTHROPIC_API_KEY_EVAL` 미설정이면 **즉시 에러로 중단**(prod 키로 절대 대체하지 않음).
- 안정성/반복 측정 시에도 **루프는 하나의 순차 잡으로만**. 백그라운드 eval을 여러 개 동시에 띄우지 말 것.

## 격리 검증 (키 발급 후)
- `npm run dev:eval` 로그에 "EVAL 키로 next dev 기동" 출력 확인.
- eval 1~2건만 돌려 정상 응답 확인 → 소비는 dev-eval 워크스페이스 Usage에만 잡히고 prod(default) 워크스페이스엔 0이어야 함.
