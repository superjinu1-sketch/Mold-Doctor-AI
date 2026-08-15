# KB 리서치 후보 큐

`kb-researcher` 스킬이 생성하는 검토용 후보 리포트가 쌓이는 곳. **이 리포트는 제안이지 확정이 아니다.**

흐름: kb-researcher(리포트 생성) → 코워크/진우 검토 → 채택 시 코워크가 적용 mandate 작성 → CC가 `lib/defect-kb.ts` 수정 → 코워크 독립검증(git show·grep·eval) → 진우 푸시.

여기의 파일을 근거로 KB를 자동 수정하지 않는다. 반드시 사람 검토 → mandate 경유.
