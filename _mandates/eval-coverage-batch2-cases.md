# Mandate: eval 커버리지 확장 Batch 2 — 미측정 노드 9종 케이스 추가

> 단방향 Cowork→CC. 정본. 작성 2026-06-12.
> 배경: 현 eval 15케이스는 31노드 중 10종만 측정. 미측정 21종 중 현장 빈도·KB 리스크 상위 9종을 추가해 24케이스로 확장.
> 기대 정답은 defect-kb v1.3 노드 정의와 정렬됨(Cowork 검수 완료). 수치는 resin-kb batch1 검증값 기준.

## 원칙

- `tests/eval/cases.json` 배열 **끝에 append만**. 기존 15케이스 수정·재정렬 금지.
- run.mjs·judge 로직 변경 금지. 케이스 추가 후 `npm run eval` 1회 실행해 **신규 9건의 점수 분포만 보고** (기존 15건은 캐시 재사용 OK — PROMPT_VERSION 변경 없음).
- 신규 케이스 점수가 낮아도 **이번에 엔진 튜닝 금지** — 실패 모드 수집이 목적. 결과는 v1.4 mandate 입력이 된다.
- expected_phase 참고: sticking은 이형 단계지만 출력 enum(filling/packing/cooling/material)에 이형이 없어 cooling으로 채점(주석 참조). mold_deposit은 휘발분 기원이라 material.

## 추가할 케이스 9건 (JSON — 이대로 append)

```json
[
  {
    "id": "pom-jetting-gatespeed",
    "source": "커버리지 확장 — jetting 노드 첫 측정",
    "title": "POM 기어 게이트부 뱀모양 줄무늬",
    "difficulty": "basic",
    "description": "POM 코폴리머 소형 기어. 사이드 게이트에서 시작하는 구불구불한 지렁이 자국.",
    "input": {
      "defect_type": "제팅 (Jetting)",
      "resin_type": "POM(아세탈)",
      "resin_detail": "POM 코폴리머",
      "machine_settings": {
        "nozzle_temp": 200, "zone1_temp": 195, "zone2_temp": 190, "zone3_temp": 185, "zone4_temp": 175,
        "mold_temp_fixed": 85, "mold_temp_moving": 85,
        "injection_pressure": 90, "holding_pressure": 50,
        "injection_speed_1": 85, "back_pressure": 8, "screw_rpm": 100
      },
      "defect_description": "게이트 바로 앞에서 시작해 캐비티 안쪽으로 이어지는 뱀처럼 구불구불한 줄무늬. 게이트가 제품 두꺼운 면을 정면으로 보고 직진 분사하는 배치."
    },
    "expected": {
      "root_cause": "사출 1단 속도 과다(85%) + 게이트가 개방 공간으로 직진 분사하는 배치 → 수지 끈 형태 선행 분사(제팅). 온도는 정상 범위.",
      "key_recommendations": [
        "사출 1단 속도 대폭 감속(게이트 통과 구간 저속) 후 2단 가속하는 다단 프로파일",
        "게이트 위치 변경 — 벽면에 부딪히게(impinge) 또는 오버랩 게이트 (근본, Mold)",
        "게이트 확대 검토",
        "멜트·금형온도는 정상 범위이므로 온도 상향은 보조 수단"
      ],
      "expected_phase": "filling",
      "severity": "medium",
      "trap": null
    }
  },
  {
    "id": "pc-void-vacuum-thick",
    "source": "커버리지 확장 — void_bubble 노드 첫 측정",
    "title": "PC 6mm 후육부 중심 기포 — 건조 정상",
    "difficulty": "basic",
    "description": "PC 광학 하우징, 두꺼운 보스(6mm) 중심부 기포. 건조는 정상.",
    "input": {
      "defect_type": "기포/보이드 (Void/Bubble)",
      "resin_type": "PC",
      "machine_settings": {
        "nozzle_temp": 300, "zone1_temp": 295, "zone2_temp": 290, "zone3_temp": 280, "zone4_temp": 270,
        "mold_temp_fixed": 90, "mold_temp_moving": 90,
        "injection_pressure": 120, "holding_pressure": 45,
        "injection_speed_1": 45, "back_pressure": 10, "screw_rpm": 80,
        "drying_temp": 120, "drying_time": 4, "dryer_type": "제습식"
      },
      "defect_description": "6mm 보스 중심부에 구형 기포. 절단 후 라이터로 가열하면 기포가 꺼져서 함몰됨. 건조 120℃ 4시간 제습식 정상."
    },
    "expected": {
      "root_cause": "후육부 + 보압 부족(사출압의 38%)으로 중심부 수축 보상 실패 → 진공 보이드. 가열 시 꺼짐 = 진공 보이드 확정 단서(가스 포켓이면 부풂). 건조 정상이므로 수분 가스 아님.",
      "key_recommendations": [
        "보압 상향(사출압의 50~80%) + 보압시간 연장(게이트 씰까지)",
        "게이트 확대·게이트를 후육부 근처로 (조기 고화 방지)",
        "후육부 코어링(살빼기) 설계 검토 (근본)",
        "멜트온도 소폭 하향도 수축량 감소에 보조적"
      ],
      "expected_phase": "packing",
      "severity": "medium",
      "trap": "가열 시 '꺼짐'을 무시하고 수분/가스(건조) 원인으로 지목하면 오진. 건조 데이터 정상 + 진공 단서가 핵심."
    }
  },
  {
    "id": "pp-delam-regrind-contam",
    "source": "커버리지 확장 — delamination 노드 첫 측정",
    "title": "PP 용기 표면 생선비늘 박리 — 재생재 공급처 변경 직후",
    "difficulty": "hard",
    "description": "PP 용기 표면이 얇은 층으로 벗겨짐. 최근 재생재 공급처가 바뀜.",
    "input": {
      "defect_type": "박리 (Delamination)",
      "resin_type": "PP",
      "resin_detail": "PP + 재생재 30%",
      "machine_settings": {
        "nozzle_temp": 230, "zone1_temp": 225, "zone2_temp": 220, "zone3_temp": 210, "zone4_temp": 200,
        "mold_temp_fixed": 40, "mold_temp_moving": 40,
        "injection_pressure": 85, "holding_pressure": 50,
        "injection_speed_1": 60, "back_pressure": 8, "screw_rpm": 120
      },
      "defect_description": "표면이 생선 비늘처럼 얇게 벗겨지고 손톱으로 긁으면 층이 일어남. 2주 전 재생재 공급처를 바꾼 뒤부터 발생. 성형 조건은 그 전과 동일."
    },
    "expected": {
      "root_cause": "이종수지 오염 — 새 재생재에 비상용성 수지(PA·PET 등) 혼입 의심. PP와 비상용 수지는 계면 접합이 안 돼 층 분리. 시점 단서(공급처 변경 직후 + 조건 무변경)가 결정적.",
      "key_recommendations": [
        "재생재 투입 중단 후 버진 100%로 A/B 테스트 (확정 진단)",
        "새 재생재 로트 이물/이종수지 검사 (DSC 융점 분석 등)",
        "재생재 공급처/등급 재검토",
        "조건 변경은 원인 확정 전 보류 (조건은 변경 이력 없음)"
      ],
      "expected_phase": "material",
      "severity": "high",
      "trap": "성형 조건(금형온도·속도)을 원인으로 지목하면 오진 — 조건은 2주 전과 동일한데 불량은 공급처 변경 후 시작. 시간 단서가 핵심."
    }
  },
  {
    "id": "abs-molddeposit-wipeable",
    "source": "커버리지 확장 — mold_deposit(#31) 노드 첫 측정",
    "title": "ABS 텍스처면 뿌연 백화 — 닦으면 지워짐 (유저는 흐름자국 선택)",
    "difficulty": "hard",
    "description": "유저가 불량유형을 '흐름자국'으로 선택했지만 실제는 금형 석출. 분류 전환 능력 측정.",
    "input": {
      "defect_type": "흐름자국 (Flow Mark)",
      "resin_type": "ABS",
      "resin_detail": "ABS 난연 그레이드",
      "machine_settings": {
        "nozzle_temp": 240, "zone1_temp": 235, "zone2_temp": 230, "zone3_temp": 220, "zone4_temp": 210,
        "mold_temp_fixed": 60, "mold_temp_moving": 60,
        "injection_pressure": 95, "holding_pressure": 55,
        "injection_speed_1": 55, "back_pressure": 8, "screw_rpm": 90,
        "drying_temp": 80, "drying_time": 3, "dryer_type": "열풍식"
      },
      "defect_description": "텍스처(부식면) 표면에 뿌연 백색 얼룩. 마른 천으로 문지르면 옅어지고 거의 지워짐. 금형 세정 직후엔 깨끗하다가 2000샷쯤부터 다시 생김. 벤트 주변과 유동 말단에 심함."
    },
    "expected": {
      "root_cause": "금형 석출(plate-out) — 난연 ABS의 첨가제·휘발분이 금형 표면에 누적 침착 + 벤트 주변 가스 응축. '닦으면 지워짐 + 세정 후 소멸·재누적 + 벤트 주변 집중' 3단서가 확정적. 흐름자국(구조적 불량, 안 닦임)이 아님 — 분류 전환 필요.",
      "key_recommendations": [
        "불량유형 재분류: 흐름자국 아님 → 금형 석출/표면 부착물",
        "금형 세정 주기 단축 + 벤트 청소·확보",
        "멜트온도 하향(휘발분 발생 억제) 및 배럴 체류시간 단축",
        "난연제 등 첨가제 패키지/그레이드 검토 (재료, 근본)"
      ],
      "expected_phase": "material",
      "severity": "medium",
      "trap": "유저가 선택한 '흐름자국'을 무비판 수용해 금형온도·속도 조정만 권고하면 오진. '닦이면 부착물' 텍스처 변별이 분기 단서."
    }
  },
  {
    "id": "abs-gateblush-fastfill",
    "source": "커버리지 확장 — gate_blush 노드 첫 측정",
    "title": "ABS 게이트 주변 부채꼴 흐림",
    "difficulty": "basic",
    "description": "게이트 직후 부채꼴 광택 저하·흐림.",
    "input": {
      "defect_type": "기타 (게이트 주변 흐림)",
      "resin_type": "ABS",
      "machine_settings": {
        "nozzle_temp": 235, "zone1_temp": 230, "zone2_temp": 225, "zone3_temp": 215, "zone4_temp": 205,
        "mold_temp_fixed": 35, "mold_temp_moving": 35,
        "injection_pressure": 100, "holding_pressure": 55,
        "injection_speed_1": 75, "back_pressure": 8, "screw_rpm": 90,
        "drying_temp": 80, "drying_time": 3, "dryer_type": "열풍식"
      },
      "defect_description": "핀포인트 게이트 바로 주변으로 부채꼴 모양 흐림과 광택 저하. 게이트에서 멀어지면 정상. 게이트 직경 0.8mm."
    },
    "expected": {
      "root_cause": "게이트 과소(0.8mm) + 사출 1단 속도 과고(75%) → 게이트 통과 전단 과다 + 금형온도 과저(35℃, ABS 권장 40~80 하한 미달)로 게이트부 급랭 → 게이트 블러시.",
      "key_recommendations": [
        "사출 1단 속도 감속(게이트 통과 구간) 후 가속 — 다단 프로파일",
        "금형온도 상향 (35→50~60℃)",
        "게이트 확대 (0.8→1.2mm급) 검토 (Mold)",
        "멜트온도 소폭 상향 보조"
      ],
      "expected_phase": "filling",
      "severity": "low",
      "trap": null
    }
  },
  {
    "id": "pptd-tigerstripe-wallslip",
    "source": "커버리지 확장 — tiger_stripe 노드 첫 측정",
    "title": "PP TD20 범퍼 호랑이 줄무늬 — 속도 올리면 악화",
    "difficulty": "hard",
    "description": "유동 방향에 수직인 광택/무광 교대 줄무늬. 속도를 올렸더니 더 심해짐.",
    "input": {
      "defect_type": "표면 얼룩 (광택 불균일)",
      "resin_type": "PP",
      "resin_detail": "PP TD20% (자동차 범퍼)",
      "machine_settings": {
        "nozzle_temp": 225, "zone1_temp": 225, "zone2_temp": 220, "zone3_temp": 210, "zone4_temp": 195,
        "mold_temp_fixed": 35, "mold_temp_moving": 35,
        "injection_pressure": 110, "holding_pressure": 60,
        "injection_speed_1": 70, "back_pressure": 10, "screw_rpm": 110
      },
      "defect_description": "긴 범퍼 제품, 게이트에서 멀어질수록 유동 방향과 수직으로 광택띠/무광띠가 번갈아 나타남. 사출속도를 60→70으로 올렸더니 줄무늬 간격이 좁아지고 더 선명해짐."
    },
    "expected": {
      "root_cause": "타이거 스트라이프 — PP/탈크계 특유의 유동 불안정(벽면 미끄럼 stick-slip + 결정화). 속도 상승 시 악화가 전형 단서. 단순 flow mark(저온·저속 기인)와 다른 메커니즘.",
      "key_recommendations": [
        "사출속도 하향 + 등속 충전 프로파일 (유동 불안정 억제)",
        "멜트·금형온도 상향 (벽면 고화층 안정화)",
        "재료 측 대책 명시: 고유동/개질 그레이드 검토 — 조건 조정만으론 한계가 있는 재료 기인 불량",
        "게이트/유동 길이 설계 검토 (장거리 유동 완화)"
      ],
      "expected_phase": "filling",
      "severity": "medium",
      "trap": "flow mark로 분류해 '속도·온도 상향'만 권고하면 오진 — 이 불량은 속도 상향 시 악화됨(실측 단서 제공됨). 재료 기인 한계를 명시해야 정답."
    }
  },
  {
    "id": "pc-esc-ipa-overpack",
    "source": "커버리지 확장 — residual_stress_esc 노드 첫 측정",
    "title": "PC 하우징 — 출하 시 양품, IPA 세척 후 이틀 뒤 크랙",
    "difficulty": "hard",
    "description": "성형 직후엔 양품. 후공정 알코올 세척 후 시간차 크랙. phase 동적판정 + 시간차 함정.",
    "input": {
      "defect_type": "크랙 (Crack)",
      "resin_type": "PC",
      "machine_settings": {
        "nozzle_temp": 295, "zone1_temp": 290, "zone2_temp": 285, "zone3_temp": 275, "zone4_temp": 265,
        "mold_temp_fixed": 85, "mold_temp_moving": 85,
        "injection_pressure": 115, "holding_pressure": 110,
        "injection_speed_1": 50, "back_pressure": 10, "screw_rpm": 75,
        "drying_temp": 120, "drying_time": 4, "dryer_type": "제습식"
      },
      "defect_description": "성형·출하 검사에서는 전수 양품. 조립 라인에서 IPA(이소프로필알코올)로 표면 세척 후 1~2일 지나면 게이트 주변에서 방사상 미세 크랙 발생. 편광판으로 보면 게이트 주변에 무지개 응력 무늬."
    },
    "expected": {
      "root_cause": "과보압(보압 110 = 사출압의 96%)으로 게이트 주변 잔류응력 과다 + IPA(PC의 ESC 유발 용제) 접촉 → 환경응력균열(ESC). 잔류응력(성형)과 용제(후공정)의 상호작용 — 어느 한쪽만 지목하면 반쪽.",
      "key_recommendations": [
        "보압 대폭 하향 (사출압의 50~80% 수준) — 잔류응력 저감이 성형 측 근본 대책",
        "편광 응력 무늬로 개선 확인 (보압 하향 후 응력 무늬 감소 검증)",
        "세척제 변경(IPA→PC 안전 세척제) 또는 세척 공정 재검토 (후공정 측)",
        "필요 시 어닐링 — 단 근본은 보압, 어닐링은 보조"
      ],
      "expected_phase": "packing",
      "severity": "high",
      "trap": "이중 함정: ① 출하 시 양품이므로 '성형조건 무관, 세척 공정 문제'로 단정 ② 반대로 IPA를 무시하고 성형만 탓함. 정답은 잔류응력×용제 상호작용. phase도 cooling이 아니라 packing(과보압 잔류응력 기원)."
    }
  },
  {
    "id": "pa66-coldslug-lowmelt",
    "source": "커버리지 확장 — cold_slug 노드 첫 측정",
    "title": "PA66 커넥터 게이트부 차가운 덩어리 — 간헐 발생",
    "difficulty": "basic",
    "description": "게이트 부근 고화 수지 덩어리 자국, 사이클이 길어진 샷 직후 발생.",
    "input": {
      "defect_type": "기타 (게이트부 이물 자국)",
      "resin_type": "PA66",
      "resin_detail": "PA66 GF30%",
      "machine_settings": {
        "nozzle_temp": 270, "zone1_temp": 280, "zone2_temp": 285, "zone3_temp": 275, "zone4_temp": 265,
        "mold_temp_fixed": 85, "mold_temp_moving": 85,
        "injection_pressure": 110, "holding_pressure": 70,
        "injection_speed_1": 65, "back_pressure": 8, "screw_rpm": 110,
        "drying_temp": 80, "drying_time": 5, "dryer_type": "제습식"
      },
      "defect_description": "게이트 바로 안쪽에 반투명한 덩어리가 박힌 자국 + 그 뒤로 짧은 줄 흔적. 매 샷은 아니고 작업자가 자리 비워 사이클이 길어진 샷 직후에 주로 발생."
    },
    "expected": {
      "root_cause": "콜드 슬러그 — 사이클 지연 동안 노즐 선단 수지가 고화(노즐 270℃는 PA66 권장 멜트 275~300℃ 하한 미달, 고화 가속) → 다음 샷에서 고화 덩어리가 캐비티 유입. 간헐성 + 사이클 지연 연동이 확정 단서.",
      "key_recommendations": [
        "노즐 온도 상향 (270→280~290℃)",
        "콜드 슬러그 웰(러너 연장부) 확보·확대 (Mold, 근본)",
        "사이클 일관성 유지 — 중단 후 재개 시 첫 1~2샷 퍼지",
        "노즐 히터·열전대 점검 (실측 온도 확인)"
      ],
      "expected_phase": "filling",
      "severity": "low",
      "trap": null
    }
  },
  {
    "id": "abs-sticking-overpack",
    "source": "커버리지 확장 — sticking/이형 노드 첫 측정",
    "title": "ABS 케이스 고정측 부착 + 이젝터 자국 백화",
    "difficulty": "basic",
    "description": "이형 시 제품이 금형에 붙고 이젝터 핀 자국이 하얗게 변형.",
    "input": {
      "defect_type": "기타 (이형 불량)",
      "resin_type": "ABS",
      "machine_settings": {
        "nozzle_temp": 240, "zone1_temp": 235, "zone2_temp": 230, "zone3_temp": 220, "zone4_temp": 210,
        "mold_temp_fixed": 55, "mold_temp_moving": 55,
        "injection_pressure": 100, "holding_pressure": 90,
        "injection_speed_1": 55, "back_pressure": 8, "screw_rpm": 90,
        "drying_temp": 80, "drying_time": 3, "dryer_type": "열풍식"
      },
      "defect_description": "이형할 때 제품이 캐비티에 달라붙어 이젝터가 밀면 핀 자국 주변이 하얗게 변형되고 가끔 찍힘. 보압을 올린 뒤부터 심해짐. 냉각시간 8초."
    },
    "expected": {
      "root_cause": "과보압(보압 90 = 사출압의 90%)으로 과충전 → 수축이 안 일어나 캐비티 벽에 밀착(부착) + 이형 저항 증가로 이젝터 부하 → 백화·변형. '보압 올린 뒤 악화'가 직접 단서.",
      "key_recommendations": [
        "보압 하향 (사출압의 50~80%) — 1순위",
        "보압시간·냉각시간 재조정 (충분한 수축 허용)",
        "이형 저항 지속 시 드래프트 각도·연마 상태 점검 (Mold)",
        "이젝터 속도 감속·면적 확대 검토 (백화 완화)"
      ],
      "expected_phase": "cooling",
      "severity": "medium",
      "trap": "이젝터 핀(기계) 문제로만 보면 반쪽 — 근본은 과보압 과충전. 단, phase는 이형 단계 불량이나 출력 enum에 ejection이 없어 cooling 채점."
    }
  }
]
```

## 완료 기준 (DoD)

- [ ] cases.json 24케이스 (15+9), JSON 유효성 통과
- [ ] `npm run eval` 1회 — 신규 9건 결과만 신규 측정 (기존 15건 캐시 재사용)
- [ ] 보고: 신규 9건 표 (id/score/pass/trap/한줄), 24케이스 전체 집계, results JSON 저장 확인
- [ ] **엔진(route·KB) 수정 금지** — 점수 낮은 건 v1.4 입력으로 보고만
- [ ] push 금지

## 참고 (judge 채점 공정성)

- abs-molddeposit-wipeable: 유저 오선택(흐름자국) → 모델이 재분류해야 PASS. v1.2 텍스처 변별 가드가 작동하는지 측정.
- pc-esc-ipa-overpack: phase packing 기대 — v1.3 동적판정의 일반화 검증 (crack인데 packing).
- pa66-coldslug-lowmelt: 노즐 270 < PA66 멜트 하한 275 — resin-kb batch1 반영 후에만 가드 발동. batch1 미반영 상태로 돌리면 그 사실을 보고에 명시.
