# 맥 이전 환경 정상화 — 줄바꿈(EOL) 정규화 + test-results 정리 (CC mandate)

> 단방향 Cowork→CC. 정본. 작성 2026-06-12.
> 배경: 윈도우→맥 이전(`fef883c` pre-mac-transfer snapshot) 후 첫 작업.
> **이 mandate가 다른 모든 작업보다 선행. 이거 끝나기 전에 다른 코드 작업 시작 금지.**

## 현황 (Cowork 확인됨, 2026-06-12)

- `git status`에 70개 파일 modified로 표시되나, `git diff --ignore-cr-at-eol --stat` 기준 실변경은 17개 파일뿐이고 그마저 전부 `test-results/` 삭제(-2344줄) + 미미한 6줄. **나머지는 100% CRLF→LF 줄바꿈 차이.**
- `.gitattributes` 없음. 방치하면 이후 모든 커밋이 줄바꿈 노이즈로 오염되고, diff 리뷰·blame이 무력화됨.
- `test-results/`의 Playwright error-context 잔재가 git에 tracked 상태 (.gitignore에 누락).
- main은 origin/main과 동기화 상태. 새 기능 커밋 없음 → 정규화하기 가장 깨끗한 타이밍.

## 원칙

- **순수 환경/저장소 위생 작업. 코드 로직·UI·프롬프트 변경 0.** 어떤 .ts/.tsx 파일도 내용(줄바꿈 제외) 수정 금지.
- 커밋은 2개로 분리 (① EOL 정규화 ② test-results 정리) — 나중에 봐도 "내용 변경 없음"이 자명하도록.
- 끝나면 검증 통과 확인, **push 금지**, 변경 파일 요약 보고. (push는 진우가 보고 받고 결정)

## 작업 0 — 부트스트랩 (다른 작업 전에 가장 먼저)

맥 첫 세션이라 두 가지가 작업 자체를 막을 수 있다. 먼저 해결:

1. **훅 스크립트 CRLF 응급 제거** — `.claude/scripts/*.sh`가 디스크에 CRLF 상태(확인됨). PreToolUse 훅(lint-banned.sh)이 맥 bash에서 `\r` 에러로 깨지면 이후 작업 전부 차단됨. 즉시 실행:
   ```bash
   perl -pi -e 's/\r$//' .claude/scripts/*.sh
   bash .claude/scripts/lint-banned.sh && echo HOOK_OK
   ```
   (이건 작업 3.5의 전체 re-checkout으로 어차피 정규화될 파일의 선행 응급조치다.)
2. **git 커밋 정체성 확인** — `git config user.name`/`user.email`이 비어 있으면 커밋 실패. 비어 있으면:
   ```bash
   git config user.name "Jinwoo Park"
   git config user.email "superjinu1@gmail.com"
   ```

## 작업 1 — .gitattributes 생성 (저장소 루트)

```gitattributes
# Normalize all text files to LF in repo
* text=auto eol=lf

# Windows scripts keep CRLF
*.bat text eol=crlf
*.cmd text eol=crlf

# Binary — never touch
*.png binary
*.jpg binary
*.jpeg binary
*.webp binary
*.ico binary
*.pdf binary
*.woff binary
*.woff2 binary
*.jar binary
*.keystore binary
```

주의: `android/gradlew.bat`이 CRLF 유지 대상(윈도우 실행 파일). 현재 modified로 떠 있는 것도 이 때문이니 `*.bat eol=crlf` 규칙으로 해소.

## 작업 2 — 전체 renormalize + 커밋 ①

```bash
git add .gitattributes
git add --renormalize .
git status --short   # 보고에 포함
git commit -m "chore(repo): normalize line endings to LF + add .gitattributes (mac transfer)"
```

- 커밋 전 `git diff --cached --ignore-cr-at-eol --stat`로 **실내용 변경 0임을 확인하고 그 출력을 보고에 첨부**할 것. 0이 아니면 중단하고 보고.

## 작업 3 — test-results 정리 + 커밋 ②

```bash
git rm -r --cached test-results/ 2>/dev/null; rm -rf test-results/
echo "/test-results/" >> .gitignore   # "# testing" 섹션에 넣을 것
git add .gitignore
git commit -m "chore(repo): untrack playwright test-results + gitignore"
```

## 작업 3.5 — 워킹트리 물리 정규화 (커밋 ①·② 이후)

`.gitattributes`는 git 비교만 정규화하고 **디스크 파일의 CRLF는 그대로 남는다.** 디스크까지 LF로 강제 재체크아웃:

```bash
git rm --cached -r . >/dev/null && git reset --hard
git status --short        # clean이어야 함
file .claude/scripts/lint-banned.sh   # "CRLF" 문구 없어야 함 (보고에 첨부)
```

주의: untracked 파일(.env.local 등)은 `reset --hard`가 건드리지 않음. 실행 전 `git stash list`가 비어 있고 커밋 ①·②가 끝난 상태인지 확인.

## 작업 4 — 맥 환경 검증 (커밋 후)

순서대로 실행, 결과 전부 보고:

1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run verify` (.claude/scripts/verify.mjs — 훅 스크립트가 맥 bash에서 도는지 겸사 확인)
4. `bash .claude/scripts/lint-banned.sh` 단독 실행 — 윈도우 경로 가정(백슬래시·CRLF) 있으면 보고만 하고 **수정은 별도 mandate**로.
5. `git status --short` — 빌드 후 워킹트리가 깨끗한지 (next-env.d.ts 등 재생성 파일 noise 여부)

## 완료 기준 (Definition of Done)

- [ ] `.gitattributes` 존재, 커밋 ①·② 완료
- [ ] 디스크 파일 LF 확인 (`file .claude/scripts/lint-banned.sh`에 CRLF 없음)
- [ ] `git status` clean (untracked/modified 0)
- [ ] `git diff --cached --ignore-cr-at-eol` 실내용 변경 0 증빙 첨부
- [ ] tsc·build·verify 3종 통과
- [ ] push 안 함, 변경 파일·검증 결과 보고

## 범위 외 (이번에 하지 말 것)

- lint-banned.sh 등 스크립트의 맥 호환 수정 (발견 시 보고만)
- node_modules·package-lock 재생성, 의존성 업그레이드
- capacitor-step3-auth (다음 mandate)
