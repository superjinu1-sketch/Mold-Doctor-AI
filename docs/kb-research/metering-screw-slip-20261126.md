# 계량 불량(스크류 슬립) 근거 조사 — 2026-11-26

대상: eval `pa6-metering-glossvar-feedside` (PA6 + 흑색 MB, 계량 불가 + 표면 번쩍임, 후방존 220→230 올리니 악화).
반영: app/api/diagnose/route.ts `meteringGuard` (지시문 v21l). 수치는 넣지 않고 방향·점검 축만 넣었다.

## 출처

1. Ralph Guyer(Solutia Nylon Plastics, Vydyne), "Get a Grip on Screw Slippage", Plastics Technology.
   - 원문 https://www.ptonline.com/articles/get-a-grip-on-screw-slippage (403), 읽은 사본 Internet Archive 2019-10-16.
   - 원인 목록: 과배압, 후방 배럴 과열 또는 과냉, 스크류·배럴 마모, 피드부가 너무 얕은 스크류, 호퍼 설계, 빈·막힌 호퍼, 젖은 수지, 과도한 활제, 미분·절단 불량 펠릿/재생재.
   - 후방존이 차가우면 배럴 벽 용융막이 안 생겨 이송이 안 된다. 체류시간이 너무 짧아도(작은 실린더) 같은 결과. 퍼지 멜트온도가 설정보다 낮거나 마블링이 보이면 이 경우.
   - 과배압이면 스크류가 제자리에서 돌고 후퇴하지 못한다.
   - 하드웨어: 마모(간극 측정), 압축비(피드 깊이), 체크링 위치 불량, 호퍼 형상(재생재 혼합 시 원형·완만한 테이퍼).
   - 나일론 등 흡습성 수지는 수분이 점도를 낮추고 수증기를 만들어 이송을 방해.
2. DuPont, "Zytel and Minlon Nylon Resin Molding Guide" (GNE-A11218-00-A1216, 2017), Distrupol 배포 PDF.
   - p.16: 호퍼존은 냉각으로 70~90℃ 유지 — 브리징·과열 방지. 후방존이 과하면 조기 용융·브리징 → 공급 불규칙("erratic feed"). 어느 실린더 존도 융점 아래로 두지 말 것. GF 나일론은 후방존이 낮으면 후퇴 시간이 늘고 토크가 커진다.
   - p.21: 나일론은 "Low to no back pressure". 비강화 주변속도 상한 0.4 m/s, GF 0.15 m/s.
   - p.13: 체크링 누설은 스크류 후퇴 시간 편차를 만든다. L/D 최소 20.
   - p.31 표 11.1: "Poor Part Surface"의 1순위 조치 = 금형온도 상향.

## 판단

- 두 출처 모두 후방존은 과냉·과열 양방향 원인이라고 본다. 작업자가 올려서 악화됐으면 과열(조기 용융·브리징) 쪽.
- 호퍼존 70~90℃는 DuPont 한 곳뿐이라 수치는 KB에 넣지 않았다.
- 표면 번쩍임은 계량과 분리해 금형온도부터(DuPont 표 11.1, KB surface_gloss rank 1).
