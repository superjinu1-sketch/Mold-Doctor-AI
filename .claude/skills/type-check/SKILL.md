# 타입 체크 스킬

## 실행 명령
npx tsc --noEmit --pretty

## 사용 시점
- .ts 또는 .tsx 파일을 수정한 후 반드시 실행
- 새 컴포넌트/타입 추가 후 실행
- 빌드 전 최종 확인

## 타입 에러 발생 시
1. 에러 메시지 읽기
2. 해당 파일의 import와 타입 정의 확인
3. 수정 후 다시 npx tsc --noEmit 실행
4. 에러 0개 확인 후 다음 작업 진행

## 커밋 전 순서
1. npx tsc --noEmit → 타입 에러 0개 확인
2. npm run build → 빌드 성공 확인
3. npm run eval → (진단 API 수정한 경우) 정확도 확인

## 프로젝트 타입 규칙
- 모든 props에 interface 또는 type 정의
- any 사용 금지 (unknown으로 대체 후 타입 가드)
- API 응답 타입은 lib/types.ts에 정의
- optional 필드는 ? 사용, 접근 시 optional chaining (?.) 필수
