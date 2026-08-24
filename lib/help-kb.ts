// 도움말 위젯 FAQ KB(help-desk-widget-v1). 사용법 질문을 비용 0으로 즉답하기 위한 키워드 매칭 소스.
// app/api/help/route.ts가 keywordsKo/keywordsEn 부분 문자열 매칭으로 우선 소비하고,
// 매칭 실패 시 answerKo/answerEn 전체를 LLM 폴백의 system 프롬프트에 그대로 주입한다.
// 문구는 진우 확정본 — 두 곳(sample·account_delete)은 실제 UI 라벨과 대조 확인 완료(문구 변경 없음).
export interface HelpKbItem {
  id: string;
  keywordsKo: string[];   // 질문 매칭용 (부분 문자열 포함 매칭)
  keywordsEn: string[];
  answerKo: string;
  answerEn: string;
  cta?: 'diagnose';       // 답변 아래 "새로 추정 시작" 버튼 노출
}

export const HELP_KB: HelpKbItem[] = [
  {
    id: 'first_diagnosis',
    keywordsKo: ['첫 진단', '시작', '어떻게 시작', '진단 방법', '추정 시작'],
    keywordsEn: ['start', 'first diagnosis', 'how to start', 'begin', 'new estimate', 'get started'],
    answerKo: '홈에서 \'새로 추정 시작\'을 누르세요. ① 불량 사진 업로드(선택) ② 수지·세팅값 입력 ③ AI 추정 시작 순서입니다. 사진과 세팅이 자세할수록 원인 후보가 정확해집니다.',
    answerEn: 'Tap \'Start new estimate\' on the home screen. ① Upload defect photos (optional) ② Enter resin and machine settings ③ Start AI analysis. More detail means better cause ranking.',
  },
  {
    id: 'no_photo',
    keywordsKo: ['사진 없이', '사진 없어도', '사진 안', '촬영 못'],
    keywordsEn: ['without photo', 'no photo', 'skip photo', 'no picture'],
    answerKo: '사진 없이도 진단됩니다. 사진 단계를 건너뛰고 불량 유형을 직접 선택한 뒤 증상을 설명하면 됩니다. 다만 은줄·버닝 같은 표면 불량은 사진이 있으면 더 정확합니다.',
    answerEn: 'Yes, you can diagnose without photos. Skip the photo step, pick the defect type manually and describe the symptom. Surface defects (splay, burn) are more accurate with photos.',
  },
  {
    id: 'photo_tips',
    keywordsKo: ['사진 몇 장', '사진 잘', '사진 팁', '업로드 방법'],
    keywordsEn: ['how many photos', 'photo tips', 'upload photo', 'how to upload'],
    answerKo: '불량 부위를 가까이서, 최대 5장까지 올릴 수 있습니다. 드래그앤드롭·클립보드 붙여넣기·카메라 촬영 모두 지원합니다.',
    answerEn: 'Up to 5 photos. Get close to the defect area. Drag and drop, clipboard paste, and camera capture are all supported.',
  },
  {
    id: 'credits',
    keywordsKo: ['크레딧', '무료로', '요금', '비용', '가격'],
    keywordsEn: ['credit', 'free', 'cost', 'price', 'how much'],
    answerKo: '진단 1건에 1크레딧이 사용되고, 가입하면 5크레딧이 무료로 제공됩니다. 무료 도구 4종(작업표준 저장소·시사출 체크리스트·수지 라이브러리·불량 가이드)은 크레딧을 쓰지 않습니다.',
    answerEn: 'One diagnosis uses 1 credit. You get 5 free credits at sign-up. The four free tools (Work Standards, Tryout Checklist, Resin Library, Defect Guide) never use credits.',
  },
  {
    id: 'topup',
    keywordsKo: ['충전', '결제', '구매', '크레딧 사', '크레딧 부족'],
    keywordsEn: ['top up', 'topup', 'purchase', 'buy credit', 'payment', 'out of credits'],
    answerKo: '상단 \'충전\' 메뉴에서 크레딧 팩을 구매할 수 있습니다.',
    answerEn: 'You can purchase credit packs from the \'Credits\' menu.',
  },
  {
    id: 'follow_up',
    keywordsKo: ['후속', '재추정', '다시 추정', '조치 후', '팔로업'],
    keywordsEn: ['follow up', 'follow-up', 're-estimate', 'second round', 'after applying'],
    answerKo: '결과 화면에서 조치를 적용한 뒤 후속 재추정을 할 수 있습니다. 세션당 2회는 무료이고, 이후에는 5회 묶음이 1크레딧입니다.',
    answerEn: 'After applying changes you can run follow-up re-estimates: 2 free per session, then a 5-pack costs 1 credit.',
  },
  {
    id: 'ocr',
    keywordsKo: ['OCR', '셋팅 사진', '세팅 사진', '조건표', '컨트롤러', '자동 입력'],
    keywordsEn: ['ocr', 'settings photo', 'condition sheet', 'controller', 'auto fill', 'auto-fill'],
    answerKo: '사출기 컨트롤러 화면이나 조건표를 촬영해 올리면 세팅값이 자동으로 입력됩니다(최대 5장). 인식값은 제출 전에 수정할 수 있습니다.',
    answerEn: 'Photograph the machine controller screen or a condition sheet and the values are read automatically (up to 5 images). You can edit them before submitting.',
  },
  {
    id: 'drawing',
    keywordsKo: ['도면', '금형 도면', 'PDF 첨부'],
    keywordsEn: ['drawing', 'mold drawing', 'pdf attach', 'attach pdf'],
    answerKo: '금형 도면 PDF(최대 2.5MB)를 첨부하면 게이트 위치·냉각 배치·후육부 리스크를 분석에 반영합니다.',
    answerEn: 'Attach a mold drawing PDF (max 2.5MB) and gate position, cooling layout and thick-section risks are factored into the analysis.',
  },
  {
    id: 'resin_pick',
    keywordsKo: ['수지 선택', '수지 없', '재료 선택', '그레이드'],
    keywordsEn: ['resin selection', 'no resin', 'material selection', 'grade not listed'],
    answerKo: '수지는 52종 라이브러리에서 선택합니다. 목록에 없는 수지는 직접 입력할 수 있습니다.',
    answerEn: 'Pick from the 52-resin library, or type your resin manually if it is not listed.',
  },
  {
    id: 'defect_types',
    keywordsKo: ['어떤 불량', '불량 종류', '진단 가능'],
    keywordsEn: ['what defects', 'defect types', 'which defects', 'can you diagnose'],
    answerKo: '미성형 short shot, 플래시, 싱크마크, 웰드라인, 버닝, 은줄 silver streak, 변색, 크랙, 휨, 보이드, 제팅, 표면 거침 12유형 + \'기타 직접 입력\'을 지원합니다.',
    answerEn: '12 defect types (short shot, flash, sink mark, weld line, burn, splay, discoloration, crack, warpage, void, jetting, surface roughness) plus free-text input.',
  },
  {
    id: 'result_read',
    keywordsKo: ['결과 보는', '결과 해석', '퍼센트', '원인 순위'],
    keywordsEn: ['read results', 'interpret results', 'percent', 'percentage', 'cause ranking'],
    answerKo: '결과는 원인 후보 랭킹(확률%), 현재 vs 권장 세팅 비교표, 현장 확인 방법 순으로 나옵니다. 퍼센트는 확정이 아니라 우선순위이니 위에서부터 순서대로 확인하세요.',
    answerEn: 'Results show ranked causes (%), a current-vs-recommended settings table, and how to verify each on the machine. Percentages are priorities, not verdicts — check from the top down.',
  },
  {
    id: 'resolved',
    keywordsKo: ['해결됨', '해결 표시', '해결 처리'],
    keywordsEn: ['resolved', 'mark resolved', 'mark as resolved'],
    answerKo: '결과 화면에서 \'해결됨\'을 표시하면 이력에 기록되고, 확정된 조건은 작업표준 저장소로 바로 저장할 수 있습니다. 같은 불량이 재발했을 때 지난 해결책을 바로 찾을 수 있습니다.',
    answerEn: 'Mark a diagnosis as Resolved to record it in your history, and save the confirmed settings straight into Work Standards. Next time the same defect appears, the fix is one tap away.',
  },
  {
    id: 'history',
    keywordsKo: ['이력', '히스토리', '지난 진단', '기록 어디'],
    keywordsEn: ['history', 'past diagnosis', 'where records', 'diagnosis history'],
    answerKo: '마이페이지에서 과거 진단 이력을 볼 수 있습니다. 계정에 저장되므로 기기를 바꿔도 로그인하면 그대로 유지됩니다.',
    answerEn: 'Open My Page for your diagnosis history. It is stored in your account, so it survives device changes — just log in.',
  },
  {
    id: 'pdf_export',
    keywordsKo: ['PDF', '저장', '내보내', '보고서'],
    keywordsEn: ['pdf', 'save', 'export', 'report'],
    answerKo: '결과 화면의 \'PDF 저장\'으로 진단 결과를 PDF 보고서로 내려받을 수 있습니다. 작업표준·시사출 기록도 각 화면에서 PDF/A4 인쇄를 지원합니다.',
    answerEn: 'Use \'Save PDF\' on the result screen. Work Standards and Tryout records also export to PDF / print to A4.',
  },
  {
    id: 'work_standard',
    keywordsKo: ['작업표준', '조건 대장', '표준 저장'],
    keywordsEn: ['work standard', 'condition ledger', 'save standard'],
    answerKo: '작업표준 저장소는 설비별 성형 조건을 등록하는 무료 도구입니다. 개정 이력이 자동으로 남고, A4로 인쇄해 사출기 옆에 게시할 수 있습니다.',
    answerEn: 'Work Standard Storage keeps process conditions per machine, free. Every revision is kept automatically, and sheets print to A4 for posting at the press.',
  },
  {
    id: 'tryout',
    keywordsKo: ['시사출', '트라이아웃', '체크리스트'],
    keywordsEn: ['tryout', 'trial run', 'checklist'],
    answerKo: '시사출 체크리스트는 신규 금형 시사출용 표준 템플릿입니다. 사전 점검부터 외관 검사까지 단계별 OK/NG를 기록하고 보고서로 내보낼 수 있습니다. 무료입니다.',
    answerEn: 'The Tryout Checklist is a standard template for new-mold tryouts: step-by-step OK/NG from pre-checks to appearance inspection, exportable as a report. Free.',
  },
  {
    id: 'resin_library',
    keywordsKo: ['수지 라이브러리', '건조 조건', '수지 정보'],
    keywordsEn: ['resin library', 'drying condition', 'resin info'],
    answerKo: '수지 라이브러리(52종)에서 건조 조건·용융 온도·금형 온도·수축률과 수지별 잦은 불량을 무료로 볼 수 있습니다.',
    answerEn: 'The Resin Library (52 grades) covers drying, melt and mold temperatures, shrinkage, and typical defects per resin. Free.',
  },
  {
    id: 'defect_guide',
    keywordsKo: ['불량 가이드', '가이드 어디'],
    keywordsEn: ['defect guide', 'where guide'],
    answerKo: '불량 가이드(12유형)에서 유형별 원인과 대처 방향을 무료로 볼 수 있습니다. 무료 도구 메뉴에 있습니다.',
    answerEn: 'The Defect Guide (12 types) lists causes and fixes per defect, free, under Free Tools.',
  },
  {
    id: 'language',
    keywordsKo: ['언어', '영어', 'english', '한국어', '번역'],
    keywordsEn: ['language', 'english', 'korean', 'translate'],
    answerKo: '상단의 🌐 EN/KO 버튼으로 한국어와 영어를 전환할 수 있습니다.',
    answerEn: 'Use the 🌐 EN/KO button in the top bar to switch between Korean and English.',
  },
  {
    id: 'sample',
    keywordsKo: ['샘플', '체험', '로그인 없이', '미리보기'],
    keywordsEn: ['sample', 'try demo', 'without login', 'preview', 'demo'],
    answerKo: '로그인 없이 \'예시로 빠르게 체험\'에서 샘플 진단(PA66 은줄)을 볼 수 있습니다. 실제 진단은 가입 후 무료 5크레딧으로 시작하세요.',
    answerEn: 'Without logging in you can view a sample diagnosis (PA66 silver streak). For real diagnoses, sign up and use your 5 free credits.',
  },
  {
    id: 'login',
    keywordsKo: ['로그인', '가입', '회원가입', '계정 만들'],
    keywordsEn: ['login', 'log in', 'sign up', 'register', 'create account'],
    answerKo: '구글·애플 계정 또는 이메일로 가입할 수 있습니다. 가입하면 5크레딧이 무료로 제공됩니다.',
    answerEn: 'Sign up with Google, Apple, or email. New accounts get 5 free credits.',
  },
  {
    id: 'account_delete',
    keywordsKo: ['계정 삭제', '탈퇴', '데이터 삭제'],
    keywordsEn: ['delete account', 'account deletion', 'delete data', 'delete my data'],
    answerKo: '계정과 데이터 삭제는 마이페이지에서 할 수 있습니다. 삭제하면 진단 이력·작업표준이 함께 삭제되며 복구되지 않습니다.',
    answerEn: 'You can delete your account and data from My Page. Deletion removes your history and work standards permanently.',
  },
  {
    id: 'tech_question',
    keywordsKo: ['싱크마크 왜', '미성형 원인', '웰드라인 없애', '불량 해결', '어떻게 고치', '원인이 뭐'],
    keywordsEn: ['why sink mark', 'short shot cause', 'remove weld line', 'fix defect', 'how to fix', 'what is the cause', 'how do i fix'],
    answerKo: '성형 기술 질문은 도움말보다 진단 기능이 정확합니다. 사진과 세팅값을 넣으면 원인 랭킹과 권장 세팅을 받을 수 있어요. 아래 버튼으로 바로 시작하세요.',
    answerEn: 'For molding questions, the diagnosis feature is the right tool — photos and settings in, ranked causes and recommended settings out. Start below.',
    cta: 'diagnose',
  },
  {
    id: 'contact',
    keywordsKo: ['문의', '이메일', '사람', '상담원', '버그', '오류 신고'],
    keywordsEn: ['contact', 'email', 'support', 'bug', 'report bug', 'human'],
    answerKo: '해결되지 않는 문제나 버그는 jinsimlabs@jinsimlabs.com 으로 보내주세요. 확인 후 답장드립니다.',
    answerEn: 'For anything unresolved or bug reports, email jinsimlabs@jinsimlabs.com.',
  },
];
