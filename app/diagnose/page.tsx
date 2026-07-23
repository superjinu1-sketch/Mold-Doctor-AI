'use client';

import { useState, useRef, useCallback, useEffect, Suspense, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DiagnosisResultPanel from '@/components/DiagnosisResultPanel';
import DiagnoseProgress from '@/components/DiagnoseProgress';
import PhotoInputTrigger, { type PhotoInputTriggerHandle } from '@/components/PhotoInputTrigger';
import { hapticImpactLight, hapticSuccess } from '@/lib/haptics';
import AuthModal from '@/components/AuthModal';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { authHeaders } from '@/lib/supabase/authHeader';
import { downscaleImageClient, safeLocalStorageSet } from '@/lib/clientDownscale';
import { apiUrl } from '@/lib/apiBase';
import { saveDiagnosisRecord, updateResolution, patchRecordFields, type HistoryRecord } from '@/lib/history-sync';

// --- Types ---
interface ImageFile {
  id: string;
  file: File;
  preview: string;
  base64: string;
  mediaType: string;
}

interface ActionTaken {
  recommendation: string;
  done: boolean;
  result: string;
}

interface FollowUpHistoryItem {
  round: number;
  timestamp: string;
  changeDescription: string;
}

interface DiagnosisResult {
  defect_type: { ko: string; en: string };
  defect_phase?: 'filling' | 'packing' | 'cooling' | 'material';
  severity: 'high' | 'medium' | 'low';
  tier?: 'simple' | 'complex';
  round?: number;
  summary: string;
  beforePhoto?: string;   // 복원 레코드의 불량 사진 썸네일(raw base64)
  process_window_check?: {
    melt_temp?: { status: 'ok' | 'warning' | 'critical'; note: string };
    mold_temp?: { status: 'ok' | 'warning' | 'critical'; note: string };
    injection_speed?: { status: 'ok' | 'warning' | 'critical'; note: string };
    pack_pressure?: { status: 'ok' | 'warning' | 'critical'; note: string };
    drying?: { status: 'ok' | 'warning' | 'critical'; note: string };
  };
  causes: {
    rank: number;
    category: string;
    probability: number;
    description: string;
    detail?: string;
    scientific_reasoning?: string;
    evidence?: string;
  }[];
  recommendations: {
    priority?: number;
    parameter: string;
    current: string;
    recommended: string;
    reason: string;
    expected_result?: string;
    risk?: string;
    interaction_note?: string;
    direction?: 'up' | 'down' | 'same';
    urgency?: 'now' | 'next_shot' | 'root';
  }[];
  avoid?: string[];
  checklist: string[] | { before_changes: string[]; after_changes: string[]; escalation: string[] };
  top5_actions?: { step: number; action: string; why: string }[];
  resin_specific_notes: string;
  drying_assessment?: string;
  additional_advice?: string;
  mold_analysis?: {
    gate_assessment: string;
    cooling_assessment: string;
    design_risk_factors: string[];
    recommendations: string[];
  };
  raw_response?: string;
}

// --- Helpers ---
function parseAIResponse(rawText: string) {
  let text = rawText.trim();

  // backtick 제거
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');

  // JSON 앞뒤의 설명 텍스트 제거 — { 부터 } 까지만 추출
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // JSON 내부 줄바꿈을 이스케이프 (문자열 값 안의 실제 줄바꿈)
  text = text.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, '\\n');

  try {
    return JSON.parse(text);
  } catch {
    try {
      const lines = text.split('\n').map(l => l.trim()).join(' ');
      return JSON.parse(lines);
    } catch {
      return {
        defect_type: { ko: '분석 완료', en: 'Analysis Complete' },
        defect_phase: 'unknown',
        severity: 'medium',
        summary: 'AI가 구조화된 형식 대신 텍스트로 응답했습니다.',
        raw_response: rawText,
        causes: [],
        recommendations: [],
        checklist: { before_changes: [], after_changes: [], escalation: [] },
      };
    }
  }
}

// --- Constants (values stay in Korean for API compatibility) ---
const DEFECT_TYPES = [
  '미성형 (Short Shot)', '플래시 (Flash)', '싱크마크 (Sink Mark)', '웰드라인 (Weld Line)',
  '버닝/가스마크 (Burn Mark)', '은줄 (Silver Streak)', '변색 (Discoloration)', '크랙 (Crack)',
  '휨/변형 (Warpage)', '기포 (Void/Bubble)', '젯팅 (Jetting)', '기타 (직접 입력)',
];

const DEFECT_KEY_MAP: Record<string, string> = {
  '미성형 (Short Shot)': 'defect.short_shot',
  '플래시 (Flash)': 'defect.flash',
  '싱크마크 (Sink Mark)': 'defect.sink_mark',
  '웰드라인 (Weld Line)': 'defect.weld_line',
  '버닝/가스마크 (Burn Mark)': 'defect.burn_mark',
  '은줄 (Silver Streak)': 'defect.silver_streak',
  '변색 (Discoloration)': 'defect.discoloration',
  '크랙 (Crack)': 'defect.crack',
  '휨/변형 (Warpage)': 'defect.warpage',
  '기포 (Void/Bubble)': 'defect.void',
  '젯팅 (Jetting)': 'defect.jetting',
  '기타 (직접 입력)': 'defect.custom',
};

// English display labels for resin options that have Korean annotations
// Values (keys) stay Korean for API compatibility; only the <option> display changes
const RESIN_OPTION_EN_LABEL: Record<string, string> = {
  'POM(아세탈)': 'POM (Acetal)',
  'PI(폴리이미드)': 'PI (Polyimide)',
  'PMMA(아크릴)': 'PMMA (Acrylic)',
};

const RESIN_OPTIONS = [
  { group: '폴리아미드 (나일론)', groupKey: 'resin.group.polyamide', options: ['PA6', 'PA66', 'PA46', 'PA410', 'PA4T', 'PA6T', 'PA9T', 'PA10T', 'PA12T', 'PA12', 'PA610', 'PA612', 'PA1010', 'PA6/66', 'MXD6'] },
  { group: '폴리에스터', groupKey: 'resin.group.polyester', options: ['PBT', 'PET', 'PCT', 'PEN'] },
  { group: '엔지니어링 플라스틱 기타', groupKey: 'resin.group.engineering', options: ['PC', 'POM(아세탈)', 'PPE/PPO', 'm-PPE'] },
  { group: '슈퍼 엔지니어링 플라스틱', groupKey: 'resin.group.super_eng', options: ['PPS', 'LCP', 'PEEK', 'PEI', 'PAI', 'PI(폴리이미드)', 'PSU', 'PPSU', 'PES', 'PTFE', 'FEP', 'PFA', 'ETFE'] },
  { group: '범용 플라스틱', groupKey: 'resin.group.commodity', options: ['PP', 'PE(HDPE)', 'PE(LDPE)', 'PE(LLDPE)', 'PS', 'ABS', 'SAN', 'ASA', 'PMMA(아크릴)', 'PVC'] },
  { group: '블렌드/알로이', groupKey: 'resin.group.blend', options: ['PC/ABS', 'PC/PBT', 'PA/ABS', 'PA/PP', 'PPE/PA', 'PBT/ABS'] },
  { group: '엘라스토머/TPE', groupKey: 'resin.group.elastomer', options: ['TPU', 'TPE', 'TPC', 'TPA', 'TPEE', 'TPV', 'TPO'] },
  { group: '기타', groupKey: 'resin.group.other', options: ['기타 (직접 입력)'] },
];

const SAMPLE_CASES = [
  {
    label: 'PA66 GF33%', defectTypeKey: 'defect.silver_streak',
    defectType: '은줄 (Silver Streak)',
    defectDescription: '제품 표면에 은색 줄무늬 발생. 5샷에 1번꼴, 게이트 부근에서 시작됨.',
    resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '33', flameRetardant: '없음', flameRetardantThickness: '미입력', flameRetardantType: '해당없음', resinDetail: 'PA66 GF33%', resinGrade: '',
    nozzleTemp: '285', zone1Temp: '280', zone2Temp: '275', zone3Temp: '265', zone4Temp: '255',
    moldTempFixed: '80', moldTempMoving: '80', injPressure1: '120', holdPressure: '80',
    injSpeed1: '60', injSpeed2: '40', holdTime: '8', coolTime: '15', injTime: '3',
    metering: '85', cushion: '5', backPressure: '5', screwRpm: '80', clampForce: '', pressureUnit: 'MPa',
    moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '콜드', weight: '45', wallThicknessMin: '1.5', wallThicknessMax: '3.0',
  },
];


// 폼 상태 sessionStorage 방어선 — 리마운트/새로고침/토큰 리프레시로 인한 입력 소실 방지
const FORM_SS_KEY = 'molddoctor_form_v1';

// 폼 섹션 아코디언 (표현 전용). 한 번에 하나 펼침 + 완료 시 ✓.
function FormSection({ step, title, open, complete, optional = false, onToggle, children }: {
  step: number; title: string; open: boolean; complete: boolean; optional?: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <section className="bg-surface rounded-[var(--radius-card-lg)] border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 min-h-[var(--touch-min)] text-left hover:bg-surface-sunken transition-colors"
      >
        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[length:var(--text-label)] font-bold tabular-nums ${complete ? 'bg-ok text-on-brand' : optional ? 'bg-surface-sunken text-muted' : 'bg-brand text-on-brand'}`}>
          {complete ? '✓' : step}
        </span>
        <span className="text-[length:var(--text-subhead)] font-bold text-ink flex-1 min-w-0">{title}</span>
        <span className="text-faint shrink-0 text-base">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 sm:px-6 pb-6">{children}</div>}
    </section>
  );
}

// --- Main Diagnose Content ---
function DiagnoseContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const { user, signInWithGoogle, setCredits, credits } = useAuth();
  const router = useRouter();

  const [images, setImages] = useState<ImageFile[]>([]);
  const [defectType, setDefectType] = useState('');
  const [customDefect, setCustomDefect] = useState('');
  const [defectDescription, setDefectDescription] = useState('');
  const [aiSuggested, setAiSuggested] = useState(false);   // 불량유형 AI 제안 배지
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState(false);   // AI 자동추정 시스템 오류(키 한도/네트워크 등) 표시
  // 진단 필수 게이트용 — 확정된 불량유형(기타는 직접 입력값)
  const effectiveDefectType = (defectType === '기타 (직접 입력)' ? customDefect.trim() : defectType);
  const [resinType, setResinType] = useState('');
  const [customResin, setCustomResin] = useState('');
  const [filler, setFiller] = useState('없음');
  const [fillerContent, setFillerContent] = useState('');
  const [flameRetardant, setFlameRetardant] = useState('없음');
  const [flameRetardantThickness, setFlameRetardantThickness] = useState('미입력');
  const [flameRetardantType, setFlameRetardantType] = useState('해당없음');
  const [resinDetail, setResinDetail] = useState('');
  const [resinGrade, setResinGrade] = useState('');
  // 그레이드 자동 입력 (resolve-grade) + 라벨 사진 OCR (extract-grade)
  const [gradeBusy, setGradeBusy] = useState(false);
  const [gradeImgBusy, setGradeImgBusy] = useState(false);
  const [gradeStatus, setGradeStatus] = useState<{ tone: 'brand' | 'warn'; text: string } | null>(null);
  const [manualResinOpen, setManualResinOpen] = useState(false);
  const [defectGridOpen, setDefectGridOpen] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [settings, setSettings] = useState({
    nozzleTemp: '', zone1Temp: '', zone2Temp: '', zone3Temp: '', zone4Temp: '',
    moldTempFixed: '', moldTempMoving: '',
    injPressure1: '', holdPressure: '',
    injSpeed1: '', injSpeed2: '',
    holdTime: '', coolTime: '', injTime: '',
    metering: '', cushion: '', backPressure: '', screwRpm: '', clampForce: '',
    pressureUnit: 'bar',
  });
  const [moldType, setMoldType] = useState('');
  const [gateType, setGateType] = useState('');
  const [cavities, setCavities] = useState('');
  const [runnerType, setRunnerType] = useState('');
  const [weight, setWeight] = useState('');
  const [wallThicknessMin, setWallThicknessMin] = useState('');
  const [wallThicknessMax, setWallThicknessMax] = useState('');
  const [productNotes, setProductNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false); // isLoading 파생 표시 전용 — 상태 머신 무접촉
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [demoSnapshot, setDemoSnapshot] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [error, setError] = useState('');

  // Follow-up state
  const [round, setRound] = useState(1);
  const [diagnosisId, setDiagnosisId] = useState<string>('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpActions, setFollowUpActions] = useState<ActionTaken[]>([]);
  const [followUpChange, setFollowUpChange] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpImages, setFollowUpImages] = useState<ImageFile[]>([]);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpHistoryItem[]>([]);
  const [previousDiagnosis, setPreviousDiagnosis] = useState<{ causes: DiagnosisResult['causes']; recommendations: DiagnosisResult['recommendations'] } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advSettings, setAdvSettings] = useState({
    vpTransferPos: '', vpTransferPressure: '',
    preInjectDecompDist: '', preInjectDecompSpeed: '', postMeterDecompDist: '',
    actualFillTime: '', actualPeakPressure: '', actualCushion: '', actualCycleTime: '', actualPartWeight: '',
    dryTemp: '', dryTime: '', dryerType: '없음', moistureContent: '',
    hrManifoldTemp: '', hrNozzle1Temp: '', hrNozzle2Temp: '', hrNozzle3Temp: '', hrNozzle4Temp: '', valveGate: '없음',
    regrindRatio: '', colorType: '없음', mbRatio: '',
    machineModel: '', screwDiameter: '', maxClampForce: '', maxInjPressure: '',
    heatingMethod: '',
  });
  const [moldDrawings, setMoldDrawings] = useState<ImageFile[]>([]);
  const [isDraggingDrawing, setIsDraggingDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingSettings, setIsDraggingSettings] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [isExtractingSettings, setIsExtractingSettings] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());
  const [settingsImages, setSettingsImages] = useState<{ id: string; preview: string }[]>([]);  // 셋팅 OCR 멀티 썸네일
  const fileInputRef = useRef<PhotoInputTriggerHandle>(null);
  const settingsImageRef = useRef<PhotoInputTriggerHandle>(null);
  const gradeImageRef = useRef<PhotoInputTriggerHandle>(null);
  const moldDrawingInputRef = useRef<PhotoInputTriggerHandle>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const followUpFormRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const progressCardRef = useRef<HTMLDivElement>(null);
  const customDefectInputRef = useRef<HTMLInputElement>(null);

  // Computed label arrays (use t() — must be inside component)
  const machineParams = [
    { key: 'injPressure1', label: t('step3.inj_pressure'), placeholder: settings.pressureUnit || 'MPa' },
    { key: 'holdPressure', label: t('step3.hold_pressure'), placeholder: settings.pressureUnit || 'MPa' },
    { key: 'injSpeed1', label: t('step3.inj_speed1'), placeholder: '%' },
    { key: 'injSpeed2', label: t('step3.inj_speed2'), placeholder: '%' },
    { key: 'holdTime', label: t('step3.hold_time'), placeholder: 'sec' },
    { key: 'coolTime', label: t('step3.cool_time'), placeholder: 'sec' },
    { key: 'injTime', label: t('step3.inj_time'), placeholder: 'sec' },
    { key: 'metering', label: t('step3.metering'), placeholder: 'mm' },
    { key: 'cushion', label: t('step3.cushion'), placeholder: 'mm' },
    { key: 'backPressure', label: t('step3.back_pressure'), placeholder: settings.pressureUnit || 'MPa' },
    { key: 'screwRpm', label: t('step3.screw_rpm'), placeholder: 'rpm' },
    { key: 'clampForce', label: t('step3.clamp'), placeholder: 'ton' },
  ];

  const tempZones = [
    { key: 'nozzleTemp', label: t('step3.nozzle') },
    { key: 'zone1Temp', label: t('step3.zone1') },
    { key: 'zone2Temp', label: t('step3.zone2') },
    { key: 'zone3Temp', label: t('step3.zone3') },
    { key: 'zone4Temp', label: t('step3.zone4') },
  ];

  const moldTempFields = [
    { key: 'moldTempFixed', label: t('step3.fixed') },
    { key: 'moldTempMoving', label: t('step3.moving') },
  ];

  const fillerOptions: [string, string][] = [
    ['없음', 'filler.none'],
    ['GF(유리섬유)', 'filler.gf'],
    ['CF(탄소섬유)', 'filler.cf'],
    ['GF+CF', 'filler.gfcf'],
    ['미네랄', 'filler.mineral'],
    ['탈크', 'filler.talc'],
    ['GB(유리비드)', 'filler.gb'],
    ['기타', 'filler.other'],
  ];

  const frTypeOptions: [string, string][] = [
    ['해당없음', 'step2.fr_none'],
    ['할로겐', 'step2.fr_halogen'],
    ['할로겐프리', 'step2.fr_hf'],
    ['적인계', 'step2.fr_phosphorus'],
    ['멜라민계', 'step2.fr_melamine'],
  ];

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // 축소본(base64)을 extract-settings로 보내 settings에 누적 병합. 반환: {filled, status}
  const extractFromScaled = async (scaled: string): Promise<{ filled: number; status: number }> => {
    const res = await fetch(apiUrl('/api/extract-settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ image: { data: scaled, mediaType: 'image/jpeg' } }),
    });
    if (!res.ok) return { filled: 0, status: res.status };
    const extracted = await res.json();
    const filledKeys: string[] = [];
    setSettings(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(extracted)) {
        if (key === 'pressureUnit') continue; // 유효값 가드 후 아래에서 처리
        if (key in updated && extracted[key]) {
          (updated as Record<string, string>)[key] = extracted[key];
          filledKeys.push(key);
        }
      }
      if (extracted.pressureUnit && ['bar', 'MPa', 'kgf/cm2'].includes(extracted.pressureUnit)) {
        updated.pressureUnit = extracted.pressureUnit;
      }
      return updated;
    });
    setExtractedFields(prev => new Set([...prev, ...filledKeys])); // 멀티 누적
    return { filled: filledKeys.length, status: 200 };
  };

  // 셋팅 OCR 멀티 업로드(최대 5장): 각 장 즉시 다운스케일(413 방지) + OCR → settings 누적. 부분추출 허용.
  const addSettingsImages = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    setIsExtractingSettings(true);
    setExtractMsg('');
    let totalFilled = 0;
    let lastErrStatus = 0;
    let decodeFailed = false;
    for (const file of arr) {
      let full = false;
      setSettingsImages(prev => { full = prev.length >= 5; return prev; });
      if (full) break;
      try {
        const raw = await fileToBase64(file);
        // OCR용: 긴 변 1800px / JPEG 0.82 — 숫자 판독 충분 + base64 1MB 이하(Vercel 413 방지)
        const scaled = await downscaleImageClient(raw, 1800, 0.82, file.type);
        if (scaled == null) { decodeFailed = true; continue; }  // HEIC 등 디코드 실패 → 스킵 + 안내
        setSettingsImages(prev => prev.length >= 5 ? prev : [...prev, { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, preview: `data:image/jpeg;base64,${scaled}` }]);
        const r = await extractFromScaled(scaled);
        if (r.status === 200) totalFilled += r.filled;
        else lastErrStatus = r.status;
      } catch {
        lastErrStatus = -1;
      }
    }
    setIsExtractingSettings(false);
    if (totalFilled > 0) setExtractMsg(`✓ ${totalFilled}${t('msg.extracted')}`);
    else if (decodeFailed) setExtractMsg(t('img.decode_failed'));
    else if (lastErrStatus === 413) setExtractMsg(t('err.extract_413'));
    else if (lastErrStatus === 422) setExtractMsg(t('err.extract_422'));
    else if (lastErrStatus) setExtractMsg(t('err.extract_fail'));
  };

  const removeSettingsImage = (id: string) => {
    // 사진만 목록에서 제거 — 이미 채워진 settings 값은 유지(사용자가 직접 수정·삭제)
    setSettingsImages(prev => prev.filter(s => s.id !== id));
  };

  // Pre-select defect type from URL param
  useEffect(() => {
    const defectParam = searchParams.get('defect');
    if (defectParam) {
      const matched = DEFECT_TYPES.find(d => d.startsWith(defectParam));
      if (matched) setDefectType(matched);
    }
  }, [searchParams]);

  // 히스토리 카운트 로드 + sessionStorage 복원 (history 페이지에서 "다시 보기" 클릭 시)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('diagnoseHistory');
      const history = JSON.parse(raw || '[]');
      setHistoryCount(history.length);
    } catch { /* ignore */ }
    try {
      const restore = sessionStorage.getItem('molddoctor_restore');
      if (restore) {
        sessionStorage.removeItem('molddoctor_restore');
        const record = JSON.parse(restore);
        setResult(record);
        setSessionId(record.session_id ?? null);
        const bi = record.beforeInput;
        if (bi) {
          if (bi.defectType) {
            if (DEFECT_TYPES.includes(bi.defectType)) setDefectType(bi.defectType);
            else { setDefectType('기타 (직접 입력)'); setCustomDefect(bi.defectType); }
          }
          if (bi.defectDescription) setDefectDescription(bi.defectDescription);
          const ri = bi.resinInfo || {};
          if (ri.resinType) {
            const isPresetResin = RESIN_OPTIONS.some(g => g.options.includes(ri.resinType));
            if (isPresetResin) setResinType(ri.resinType);
            else { setResinType('기타 (직접 입력)'); setCustomResin(ri.resinType); }
          }
          if (ri.filler) setFiller(ri.filler);
          if (ri.fillerContent) setFillerContent(ri.fillerContent);
          if (ri.flameRetardant) setFlameRetardant(ri.flameRetardant);
          if (ri.flameRetardantThickness) setFlameRetardantThickness(ri.flameRetardantThickness);
          if (ri.flameRetardantType) setFlameRetardantType(ri.flameRetardantType);
          if (ri.resinDetail) setResinDetail(ri.resinDetail);
          if (ri.resinGrade) setResinGrade(ri.resinGrade);
          if (bi.settings) setSettings(prev => ({ ...prev, ...bi.settings }));
          if (bi.advSettings) setAdvSettings(prev => ({ ...prev, ...bi.advSettings }));
          const mi = bi.moldInfo || {};
          if (mi.moldType) setMoldType(mi.moldType);
          if (mi.gateType) setGateType(mi.gateType);
          if (mi.cavities) setCavities(mi.cavities);
          if (mi.runnerType) setRunnerType(mi.runnerType);
          const pi = bi.productInfo || {};
          if (pi.weight) setWeight(pi.weight);
          if (pi.wallThicknessMin) setWallThicknessMin(pi.wallThicknessMin);
          if (pi.wallThicknessMax) setWallThicknessMax(pi.wallThicknessMax);
          if (pi.notes) setProductNotes(pi.notes);
        }
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
      }
    } catch { /* ignore */ }
    // 폼 입력 복원 (리마운트/새로고침/토큰 리프레시 방어선) — 텍스트 입력만, 이미지 제외
    try {
      const savedForm = sessionStorage.getItem(FORM_SS_KEY);
      if (savedForm) {
        const f = JSON.parse(savedForm);
        if (f.defectType) setDefectType(f.defectType);
        if (f.customDefect) setCustomDefect(f.customDefect);
        if (f.defectDescription) setDefectDescription(f.defectDescription);
        if (f.resinType) setResinType(f.resinType);
        if (f.customResin) setCustomResin(f.customResin);
        if (f.filler) setFiller(f.filler);
        if (f.fillerContent) setFillerContent(f.fillerContent);
        if (f.flameRetardant) setFlameRetardant(f.flameRetardant);
        if (f.flameRetardantThickness) setFlameRetardantThickness(f.flameRetardantThickness);
        if (f.flameRetardantType) setFlameRetardantType(f.flameRetardantType);
        if (f.resinDetail) setResinDetail(f.resinDetail);
        if (f.resinGrade) setResinGrade(f.resinGrade);
        if (f.settings) setSettings(prev => ({ ...prev, ...f.settings }));
        if (f.advSettings) setAdvSettings(prev => ({ ...prev, ...f.advSettings }));
        if (f.moldType) setMoldType(f.moldType);
        if (f.gateType) setGateType(f.gateType);
        if (f.cavities) setCavities(f.cavities);
        if (f.runnerType) setRunnerType(f.runnerType);
        if (f.weight) setWeight(f.weight);
        if (f.wallThicknessMin) setWallThicknessMin(f.wallThicknessMin);
        if (f.wallThicknessMax) setWallThicknessMax(f.wallThicknessMax);
        if (f.productNotes) setProductNotes(f.productNotes);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 조건 대장(/ledger)에서 "[이 조건으로 AI 추정]" 클릭 시 프리필. molddoctor_restore와 달리
  // result/sessionId는 건드리지 않는다 — 완료된 결과 화면이 아니라 신규 추정 입력 폼을 그대로
  // 채워서 사용자가 검토 후 직접 제출하게 한다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('molddoctor_ledger_prefill');
      if (!raw) return;
      sessionStorage.removeItem('molddoctor_ledger_prefill');
      const data = JSON.parse(raw);
      if (data.resinType) {
        const isPresetResin = RESIN_OPTIONS.some(g => g.options.includes(data.resinType));
        if (isPresetResin) setResinType(data.resinType);
        else { setResinType('기타 (직접 입력)'); setCustomResin(data.customResin || data.resinType); }
      }
      if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
      if (data.advSettings) setAdvSettings(prev => ({ ...prev, ...data.advSettings }));
      if (data.photo?.base64) {
        const byteChars = atob(data.photo.base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: data.photo.mediaType || 'image/jpeg' });
        const file = new File([blob], 'ledger-condition.jpg', { type: data.photo.mediaType || 'image/jpeg' });
        const id = `ledger-${Date.now()}`;
        setImages(prev => [...prev, {
          id, file,
          preview: `data:${data.photo.mediaType || 'image/jpeg'};base64,${data.photo.base64}`,
          base64: data.photo.base64,
          mediaType: data.photo.mediaType || 'image/jpeg',
        }].slice(0, 5));
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 폼 상태를 sessionStorage에 디바운스 저장 (내용이 있을 때만) — 소실 방어선
  useEffect(() => {
    const hasContent = !!(defectType || customDefect || defectDescription || resinType);
    if (!hasContent) return;
    const handle = setTimeout(() => {
      try {
        sessionStorage.setItem(FORM_SS_KEY, JSON.stringify({
          defectType, customDefect, defectDescription, resinType, customResin,
          filler, fillerContent, flameRetardant, flameRetardantThickness, flameRetardantType,
          resinDetail, resinGrade, settings, advSettings,
          moldType, gateType, cavities, runnerType,
          weight, wallThicknessMin, wallThicknessMax, productNotes,
        }));
      } catch { /* quota/직렬화 실패 무시 */ }
    }, 400);
    return () => clearTimeout(handle);
  }, [defectType, customDefect, defectDescription, resinType, customResin,
      filler, fillerContent, flameRetardant, flameRetardantThickness, flameRetardantType,
      resinDetail, resinGrade, settings, advSettings,
      moldType, gateType, cavities, runnerType,
      weight, wallThicknessMin, wallThicknessMax, productNotes]);

  // 수기 수지 필드: 저장값·복원·샘플·자동채움으로 resinType이 채워지면 펼침 (기본 접힘)
  useEffect(() => {
    if (resinType || customResin) setManualResinOpen(true);
  }, [resinType, customResin]);

  // '기타 (직접 입력)' 선택 시 입력 칸으로 자동 포커스
  useEffect(() => {
    if (defectType === '기타 (직접 입력)') customDefectInputRef.current?.focus();
  }, [defectType]);

  // 진단 진행 카드 표시 — isLoading을 관찰만 함(상태 머신 자체는 무접촉). 카드가 결과 도착 시
  // 100%까지 채운 뒤 스스로 닫히도록(onExitComplete) isLoading이 꺼진 뒤에도 잠깐 더 유지.
  useEffect(() => {
    if (isLoading) {
      setProgressVisible(true);
      setTimeout(() => progressCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
  }, [isLoading]);

  // 그레이드명 → resolve-grade 자동 입력. 응답 enum을 폼 setter에 그대로 set(환각0: null이면 미채움).
  const handleAutoFillGrade = async () => {
    const grade = resinGrade.trim();
    if (!grade || gradeBusy) return;
    setGradeBusy(true);
    setGradeStatus(null);
    try {
      const res = await fetch(apiUrl('/api/resolve-grade'), {
        method: 'POST',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade }),
      });
      if (res.status === 401) {
        setAuthOpen(true);
        setManualResinOpen(true);
        setGradeStatus({ tone: 'warn', text: t('grade.err_unauth') });
        return;
      }
      if (res.status === 429) {
        setManualResinOpen(true);
        setGradeStatus({ tone: 'warn', text: t('grade.err_rate') });
        return;
      }
      if (!res.ok) {
        setManualResinOpen(true);
        setGradeStatus({ tone: 'warn', text: t('grade.err_fail') });
        return;
      }
      const data = await res.json();
      applyResolved(data); // null(미상)이면 환각0 처리
    } catch {
      setManualResinOpen(true);
      setGradeStatus({ tone: 'warn', text: t('grade.err_fail') });
    } finally {
      setGradeBusy(false);
    }
  };

  // resolve 결과를 폼에 적용 (작업1·작업3 공용). resinType=null이면 자동채움 금지(환각0).
  const applyResolved = (data: {
    resinType?: string | null; filler?: string; fillerContent?: string;
    flameRetardant?: string; flameRetardantType?: string; confidence?: string;
  } | null) => {
    if (!data || data.resinType == null) {
      setManualResinOpen(true);
      setGradeStatus({ tone: 'warn', text: t('grade.err_unknown') });
      return;
    }
    // enum 1:1 set. flameRetardantThickness·resinDetail·customResin 미손상.
    setResinType(data.resinType);
    if (typeof data.filler === 'string') setFiller(data.filler);
    setFillerContent(typeof data.fillerContent === 'string' ? data.fillerContent : '');
    if (typeof data.flameRetardant === 'string') setFlameRetardant(data.flameRetardant);
    if (typeof data.flameRetardantType === 'string') setFlameRetardantType(data.flameRetardantType);
    setManualResinOpen(true);
    setGradeStatus(data.confidence === 'low'
      ? { tone: 'warn', text: t('grade.warn_low') }
      : { tone: 'brand', text: t('grade.filled') });
  };

  // 📷 포대 라벨 사진 OCR → 그레이드명 인식 + 자동채움 (extract-grade)
  const handleLabelImage = async (file: File) => {
    if (!file.type.startsWith('image/') || gradeImgBusy) return;
    setGradeImgBusy(true);
    setGradeStatus(null);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch(apiUrl('/api/extract-grade'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ image: { data: base64, mediaType: file.type } }),
      });
      if (res.status === 401) { setAuthOpen(true); setManualResinOpen(true); setGradeStatus({ tone: 'warn', text: t('grade.err_unauth') }); return; }
      if (res.status === 429) { setManualResinOpen(true); setGradeStatus({ tone: 'warn', text: t('grade.err_rate') }); return; }
      if (res.status === 413 || res.status === 415) { setGradeStatus({ tone: 'warn', text: t('grade.err_image') }); return; }
      if (!res.ok) { setGradeStatus({ tone: 'warn', text: t('grade.err_fail') }); return; }
      const data = await res.json(); // { ocr, resolved, cached }
      const gname = typeof data?.ocr?.gradeName === 'string' ? data.ocr.gradeName : '';
      if (gname) setResinGrade(gname); // 인식한 그레이드명 표시
      if (data?.resolved && data.resolved.resinType != null) {
        applyResolved(data.resolved);
      } else if (gname) {
        setManualResinOpen(true);
        setGradeStatus({ tone: 'warn', text: t('grade.err_unknown') });
      } else {
        setManualResinOpen(true);
        setGradeStatus({ tone: 'warn', text: t('grade.err_photo') });
      }
    } catch {
      setGradeStatus({ tone: 'warn', text: t('grade.err_fail') });
    } finally {
      setGradeImgBusy(false);
    }
  };

  const processFile = useCallback(async (file: File): Promise<ImageFile | null> => {
    if (!file.type.startsWith('image/')) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const rawBase64 = dataUrl.split(',')[1];
        const scaled = await downscaleImageClient(rawBase64, 1568, 0.82, file.type);
        if (scaled == null) { setError(t('img.decode_failed')); resolve(null); return; }  // HEIC 등 디코드 실패 → 오라벨 전송 대신 거부+안내
        resolve({
          id: Math.random().toString(36).slice(2),
          file,
          preview: `data:image/jpeg;base64,${scaled}`,
          base64: scaled,
          mediaType: 'image/jpeg',
        });
      };
      reader.readAsDataURL(file);
    });
  }, [t]);

  // 금형 도면 PDF 전용 처리 — 다운스케일 금지(이미지 아님). preview:''가 기존 PDF 칩 UI를 트리거.
  const processDrawingPdf = useCallback(async (file: File): Promise<ImageFile | null> => {
    if (file.type !== 'application/pdf') return null;
    const MAX_DRAWING_PDF = 2.5 * 1024 * 1024;   // 2.5MB (base64 ~1.37배 팽창 → 서버 413 페이로드 천장 4.4MB 정합, 도면+사진 동시 여유)
    if (file.size > MAX_DRAWING_PDF) {
      setError(locale === 'en'
        ? 'The drawing PDF is too large (max 2.5MB). Please compress and attach again.'
        : '도면 PDF가 너무 큽니다 (최대 2.5MB). 파일을 줄여 다시 첨부해주세요.');
      return null;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const rawBase64 = dataUrl?.split(',')[1] ?? '';
        if (!rawBase64) { resolve(null); return; }
        resolve({
          id: Math.random().toString(36).slice(2),
          file,
          preview: '',
          base64: rawBase64,
          mediaType: 'application/pdf',
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, [locale]);

  const addMoldDrawings = useCallback(async (files: FileList | File[]) => {
    const all = Array.from(files);
    const accepted = all.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (accepted.length < all.length) setError(t('step4.drawing_unsupported'));   // CAD 등 미지원 파일 거부 안내(무음 폐기 금지)
    const processed = await Promise.all(
      accepted.map(f => f.type === 'application/pdf' ? processDrawingPdf(f) : processFile(f))
    );
    const valid = processed.filter(Boolean) as ImageFile[];
    setMoldDrawings(prev => [...prev, ...valid].slice(0, 3));
  }, [processFile, processDrawingPdf, t]);

  // 사진→불량유형 AI 제안(보조 기능: 크레딧 무차감)
  // 무검출은 조용히 무시, 단 시스템 오류(키 한도/네트워크)는 사용자에게 표시
  const classifyDefect = useCallback(async (img: ImageFile) => {
    setIsClassifying(true);
    setClassifyError(false);
    try {
      const res = await fetch(apiUrl('/api/classify-defect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ image: { data: img.base64, mediaType: img.mediaType } }),
      });
      if (!res.ok) {
        // 시스템 오류(예: 400 usage limit, 429, 5xx) — 조용히 삼키지 말고 표시
        console.warn('[classify-defect] non-ok status:', res.status);
        setClassifyError(true);
        return;
      }
      const data = await res.json();
      const en = typeof data?.defect_type?.en === 'string' ? data.defect_type.en.trim() : '';
      if (!en || data?.confidence === 'low') return;   // 무검출/저신뢰 = 정상 무시(오류 아님)
      const matched = DEFECT_TYPES.find(d => d.includes(en));
      if (matched) { setDefectType(matched); setAiSuggested(true); }
    } catch (e) {
      console.warn('[classify-defect] request failed:', e);
      setClassifyError(true);
    } finally {
      setIsClassifying(false);
    }
  }, []);

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const processed = await Promise.all(fileArray.map(processFile));
    const valid = processed.filter(Boolean) as ImageFile[];
    setImages(prev => [...prev, ...valid].slice(0, 5));
    if (valid.length > 0) void hapticImpactLight();
    // 유형 미선택 상태에서 첫 사진이면 AI 제안 호출(사용자 선택은 존중)
    if (valid.length > 0 && !defectType) void classifyDefect(valid[0]);
  }, [processFile, defectType, classifyDefect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addImages(e.dataTransfer.files);
  }, [addImages]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length === 0) return;
    if (openSection === 3) addSettingsImages(imageFiles); // 셋팅 OCR (멀티 누적) — Step3 열림 시
    else addImages(imageFiles);                            // 불량 (기존)
  }, [addImages, openSection, addSettingsImages]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const setSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setExtractedFields(prev => { const n = new Set(prev); n.delete(key); return n; });
  };
  const setAdvSetting = (key: string, value: string) => {
    setAdvSettings(prev => ({ ...prev, [key]: value }));
  };

  const loadSample = (idx: number) => {
    const d = SAMPLE_CASES[idx];
    setDefectType(d.defectType);
    setDefectDescription(d.defectDescription);
    setResinType(d.resinType);
    setFiller(d.filler);
    setFillerContent(d.fillerContent);
    setFlameRetardant(d.flameRetardant);
    setFlameRetardantThickness(d.flameRetardantThickness);
    setFlameRetardantType(d.flameRetardantType);
    setResinDetail(d.resinDetail);
    setResinGrade(d.resinGrade);
    setSettings({
      nozzleTemp: d.nozzleTemp, zone1Temp: d.zone1Temp,
      zone2Temp: d.zone2Temp, zone3Temp: d.zone3Temp, zone4Temp: d.zone4Temp,
      moldTempFixed: d.moldTempFixed, moldTempMoving: d.moldTempMoving,
      injPressure1: d.injPressure1, holdPressure: d.holdPressure,
      injSpeed1: d.injSpeed1, injSpeed2: d.injSpeed2,
      holdTime: d.holdTime, coolTime: d.coolTime, injTime: d.injTime,
      metering: d.metering, cushion: d.cushion, backPressure: d.backPressure,
      screwRpm: d.screwRpm, clampForce: d.clampForce,
      pressureUnit: d.pressureUnit ?? 'bar',
    });
    setMoldType(d.moldType);
    setGateType(d.gateType);
    setCavities(d.cavities);
    setRunnerType(d.runnerType);
    setWeight(d.weight);
    setWallThicknessMin(d.wallThicknessMin);
    setWallThicknessMax(d.wallThicknessMax);
    setDemoSnapshot(JSON.stringify({
      defectType: d.defectType, resinType: d.resinType,
      nozzleTemp: d.nozzleTemp, zone1Temp: d.zone1Temp, zone2Temp: d.zone2Temp,
      moldTempFixed: d.moldTempFixed, injPressure1: d.injPressure1, holdPressure: d.holdPressure,
      injSpeed1: d.injSpeed1, holdTime: d.holdTime, coolTime: d.coolTime,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiagnose = async () => {
    // 검증 실패 시 조용한 무반응 금지 — 명시적 메시지 + 에러 위치로 스크롤
    const showValidationError = (msg: string) => {
      setError(msg);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    };
    // 필수: 불량 정보(유형·설명·이미지 중 최소 1개). 섹션1 입력 소실 시 빈 채로 제출되어 오진되는 것을 차단.
    const effectiveDefect = defectType === '기타 (직접 입력)' ? customDefect : defectType;
    if (!effectiveDefect && !defectDescription.trim() && images.length === 0) {
      setOpenSection(1); // 접힌 섹션 펼쳐 입력 가능하게
      showValidationError(t('err.defect_required'));
      return;
    }
    const effectiveResin = resinType === '기타 (직접 입력)' ? customResin : resinType;
    if (!effectiveResin) {
      setOpenSection(2);
      setManualResinOpen(true); // 접혀 있으면 필수 수지 필드 펼쳐 보이게
      showValidationError(t('err.resin_required'));
      return;
    }
    const currentSnapshot = JSON.stringify({
      defectType, resinType,
      nozzleTemp: settings.nozzleTemp, zone1Temp: settings.zone1Temp, zone2Temp: settings.zone2Temp,
      moldTempFixed: settings.moldTempFixed, injPressure1: settings.injPressure1, holdPressure: settings.holdPressure,
      injSpeed1: settings.injSpeed1, holdTime: settings.holdTime, coolTime: settings.coolTime,
    });
    const isDemo = demoSnapshot !== null && currentSnapshot === demoSnapshot;

    if (!user && !isDemo) {
      setError(t('auth.login_required'));
      await signInWithGoogle();
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    void hapticImpactLight();

    try {
      const isFollowUp = round > 1 && previousDiagnosis !== null;
      const payload = {
        defectType: defectType === '기타 (직접 입력)' ? customDefect : defectType,
        defectDescription,
        resinInfo: {
          resinType: resinType === '기타 (직접 입력)' ? customResin : resinType,
          filler, fillerContent, flameRetardant, flameRetardantThickness, flameRetardantType, resinDetail, resinGrade,
        },
        settings,
        advSettings,
        pressureUnit: settings.pressureUnit,
        moldInfo: { moldType, gateType, cavities, runnerType },
        productInfo: { weight, wallThicknessMin, wallThicknessMax, notes: productNotes },
        images: [...images, ...followUpImages].map(img => ({ data: img.base64, mediaType: img.mediaType })),
        moldDrawings: moldDrawings.map(img => ({ data: img.base64, mediaType: img.mediaType })),
        locale,
        ...(isFollowUp && {
          isFollowUp: true,
          round,
          previousDiagnosis,
          actionsTaken: followUpActions,
          changeDescription: followUpChange + (followUpNotes ? `\n${followUpNotes}` : ''),
        }),
      };

      const res = await fetch(apiUrl('/api/diagnose'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(isDemo ? {} : await authHeaders()) },
        body: JSON.stringify({ ...payload, isDemo }),
      });

      if (!isDemo) {
        if (res.status === 401) { setError(t('auth.login_required')); await signInWithGoogle(); return; }
        if (res.status === 402) { setError(t('credit.insufficient')); router.push('/pricing'); return; }
      }
      if (!res.ok) {
        let errMsg = t('err.estimate_fail');
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const diagnosisTier = (res.headers.get('X-Diagnosis-Tier') || 'simple') as 'simple' | 'complex';
      const diagnosisRound = Number(res.headers.get('X-Diagnosis-Round') || round);
      const newSessionId = res.headers.get('X-Session-Id');   // 데모는 null
      setSessionId(newSessionId);   // 데모면 null → 팔로업 비활성
      const creditHeader = res.headers.get('X-Credit-Balance');
      if (creditHeader !== null) setCredits(Number(creditHeader));

      const data = await res.json();
      data.tier = diagnosisTier;
      data.round = diagnosisRound;
      if (newSessionId) data.session_id = newSessionId;
      setResult(data);
      void hapticSuccess();
      setShowFollowUpForm(false);
      // 진단 성공 → 폼 방어선 스냅샷 클리어 (다음 방문 시 stale 복원 방지)
      try { sessionStorage.removeItem(FORM_SS_KEY); } catch { /* ignore */ }

      if (round > 1) {
        setFollowUpHistory(prev => [
          ...prev.filter(h => h.round < diagnosisRound),
          { round: diagnosisRound - 1, timestamp: new Date().toISOString(), changeDescription: followUpChange },
        ]);
      }

      const newId = String(Date.now());
      setDiagnosisId(newId);
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('diagnoseHistory') : null;
        const history = JSON.parse(raw || '[]');
        const record = {
          ...data,
          timestamp: new Date().toISOString(),
          id: newId,
          round: diagnosisRound,
          beforeResin: resinType === '기타 (직접 입력)' ? customResin : resinType,
          beforeSettings: { ...settings },
          beforeInput: {
            defectType: defectType === '기타 (직접 입력)' ? customDefect : defectType,
            defectDescription,
            resinInfo: {
              resinType: resinType === '기타 (직접 입력)' ? customResin : resinType,
              filler, fillerContent, flameRetardant, flameRetardantThickness, flameRetardantType, resinDetail, resinGrade,
            },
            settings: { ...settings },
            advSettings: { ...advSettings },
            pressureUnit: settings.pressureUnit,
            moldInfo: { moldType, gateType, cavities, runnerType },
            productInfo: { weight, wallThicknessMin, wallThicknessMax, notes: productNotes },
            locale,
          },
        };
        history.unshift(record);
        const trimmed = history.slice(0, 20);
        if (!safeLocalStorageSet('diagnoseHistory', JSON.stringify(trimmed))) {
          // QuotaExceeded: retry without images
          trimmed.forEach((r: Record<string, unknown>) => { delete r.beforePhoto; delete r.afterPhoto; });
          safeLocalStorageSet('diagnoseHistory', JSON.stringify(trimmed));
        }
        // 서버 동기화 (로그인 시) — localStorage는 폴백으로 유지
        if (user) { void saveDiagnosisRecord(record as unknown as HistoryRecord, user.id); }
        // 비동기: 첫 번째 불량 사진을 축소해 beforePhoto로 추가 저장
        if (images.length > 0) {
          downscaleImageClient(images[0].base64, 400).then(thumb => {
            if (!thumb) return;  // 디코드 실패 시 썸네일 스킵(입력이 이미 jpeg라 실사례는 없음, 타입 가드)
            try {
              const r2 = localStorage.getItem('diagnoseHistory');
              const h2 = JSON.parse(r2 || '[]');
              const idx = h2.findIndex((h: { id: string }) => h.id === newId);
              if (idx !== -1) {
                h2[idx].beforePhoto = thumb;
                safeLocalStorageSet('diagnoseHistory', JSON.stringify(h2));
              }
            } catch { /* ignore */ }
            if (user) { void patchRecordFields(newId, user.id, { beforePhoto: thumb }); }
          });
        }
      } catch { /* ignore */ }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      const isNetworkErr = err instanceof TypeError || (err instanceof Error && /fetch/i.test(err.message));
      setError(isNetworkErr ? t('err.network') : (err instanceof Error ? err.message : t('err.estimate_error')));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePDF = async () => {
    if (!result) return;
    // 모든 섹션 강제 펼침 후 캡처 (finally에서 반드시 해제 → 사용자 펼침 상태 복원)
    setPdfExporting(true);
    // React 리렌더 + 레이아웃 반영 대기(2프레임)
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const { jsPDF } = await import('jspdf');
      const el = resultRef.current;
      if (!el) return;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const M = 6;                         // 여백(mm)
      const GAP = 4;                       // 블록 간 간격(mm)
      const imgW = pageW - M * 2;
      const pageAvail = pageH - M * 2;     // 한 페이지 가용 높이
      let y = M;

      const placeBlock = async (node: HTMLElement): Promise<void> => {
        const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        if (!canvas.width || !canvas.height) return;
        const imgH = (canvas.height * imgW) / canvas.width;

        // (a) 한 페이지에 드는 블록: 남은 공간에 안 들어가면 새 페이지 → 통째 배치
        if (imgH <= pageAvail) {
          if (y + imgH > pageH - M) { pdf.addPage(); y = M; }
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', M, y, imgW, imgH);
          y += imgH + GAP;
          return;
        }

        // (b) 페이지보다 큰 블록: 직계 자식으로 재귀 분할(픽셀 슬라이싱 회피)
        const kids = Array.from(node.children).filter(
          (c): c is HTMLElement => c instanceof HTMLElement && c.offsetHeight > 0
        );
        if (kids.length > 1) {
          for (const kid of kids) await placeBlock(kid);
          return;
        }

        // (c) 더 못 쪼개는 단일 거대 블록(희귀): 최후의 픽셀 슬라이싱
        if (y > M) { pdf.addPage(); y = M; }
        const data = canvas.toDataURL('image/png');
        let pos = M;
        let left = imgH;
        pdf.addImage(data, 'PNG', M, pos, imgW, imgH);
        left -= (pageH - M - pos);
        while (left > 0) {
          pdf.addPage();
          pos = M - (imgH - left);
          pdf.addImage(data, 'PNG', M, pos, imgW, imgH);
          left -= (pageH - M * 2);
        }
        pdf.addPage();
        y = M;
      };

      // 마커가 하나도 없으면 기존 단일 캡처 폴백(안전)
      const blocks = Array.from(el.querySelectorAll<HTMLElement>('[data-pdf-block]'));
      const target: HTMLElement[] = blocks.length ? blocks : [el];
      for (const block of target) await placeBlock(block);

      pdf.save(`mold-doctor-${result.defect_type.en.replace(/\s/g, '-')}-${Date.now()}.pdf`);
    } catch (e) {
      console.error('PDF save failed:', e);
      alert(t('err.pdf_error'));
    } finally {
      setPdfExporting(false);
    }
  };

  const handleResolved = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResolvedWithStatus = (status: string, memo: string, afterPhoto?: string) => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('diagnoseHistory') : null;
      const history = JSON.parse(raw || '[]');
      const idx = history.findIndex((h: { id: string }) => h.id === diagnosisId);
      if (idx !== -1) {
        history[idx].resolved = status;
        history[idx].resolvedAt = new Date().toISOString();
        if (memo) history[idx].resolvedMemo = memo;
        // after-settings: 현재 settings 캡처
        history[idx].afterSettings = { ...settings };
        if (afterPhoto) history[idx].afterPhoto = afterPhoto;
        if (!safeLocalStorageSet('diagnoseHistory', JSON.stringify(history))) {
          // QuotaExceeded: 사진 없이 재시도
          if (afterPhoto) delete history[idx].afterPhoto;
          safeLocalStorageSet('diagnoseHistory', JSON.stringify(history));
        }
        setHistoryCount(history.length);
        // 서버 동기화 (로그인 시)
        if (user) {
          void updateResolution(diagnosisId, user.id, {
            resolved: status,
            resolvedAt: new Date().toISOString(),
            ...(memo ? { resolvedMemo: memo } : {}),
            afterSettings: { ...settings },
            ...(afterPhoto ? { afterPhoto } : {}),
          });
        }
      }
    } catch { /* ignore */ }
  };

  const handleStartFollowUp = () => {
    if (!result) return;
    const actions: ActionTaken[] = result.recommendations.map(rec => ({
      recommendation: `${rec.parameter}: ${rec.current} → ${rec.recommended}`,
      done: false,
      result: '',
    }));
    setPreviousDiagnosis({ causes: result.causes, recommendations: result.recommendations });
    setFollowUpActions(actions);
    setFollowUpChange('');
    setFollowUpNotes('');
    setFollowUpImages([]);
    setShowFollowUpForm(true);
    setRound(prev => prev + 1);
    setTimeout(() => followUpFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleFollowUpSubmit = async () => {
    await handleDiagnose();
  };

  const addFollowUpImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const processed = await Promise.all(fileArray.map(processFile));
    const valid = processed.filter(Boolean) as ImageFile[];
    setFollowUpImages(prev => [...prev, ...valid].slice(0, 5));
  }, [processFile]);

  const inputCls = "ui-input";
  const labelCls = "ui-label";
  const selectCls = "ui-input ui-select";
  const settingInputCls = (key: string) => extractedFields.has(key)
    ? "w-full bg-brand-tint border border-[var(--brand-border)] rounded-lg px-3 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-[var(--brand-border)] min-h-[var(--touch-min)]"
    : "w-full bg-surface-sunken border border-border rounded-lg px-3 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-[var(--brand-border)] min-h-[var(--touch-min)]";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink mb-2">{t('diagnose.title')}</h1>
          <p className="text-muted text-base">{t('diagnose.subtitle')}</p>
        </div>
      </div>

      {/* 지난 기록 진입점 — 1건 이상 있을 때만 노출 */}
      {historyCount > 0 && (
        <div className="mb-4 flex items-center justify-between bg-brand-tint border border-[var(--brand-border)] rounded-xl px-4 py-3">
          <span className="text-brand-ink text-sm font-semibold">
            📋 {t('history.recent_n')} {historyCount}{locale === 'en' ? '' : '건'}
          </span>
          <Link href="/history"
            className="text-brand-ink text-sm font-bold hover:underline min-h-[44px] flex items-center">
            {t('history.view_all')} →
          </Link>
        </div>
      )}

      {/* Sample cases */}
      <div className="mb-6 bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-brand-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-faint font-semibold text-sm">{t('diagnose.sample_title')}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0">
          {SAMPLE_CASES.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadSample(i)}
              className="shrink-0 bg-surface-sunken hover:bg-brand-tint text-muted hover:text-brand-ink border border-border hover:border-[var(--brand-border)] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] flex items-center"
            >
              {c.label} — {t(c.defectTypeKey)}
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-4 ${!result ? 'pb-28' : ''}`}>
        {/* STEP 1: Defect Info */}
        <FormSection step={1} title={t('step1.title')} open={openSection === 1}
          complete={!!(defectType || customDefect || defectDescription || images.length)}
          onToggle={() => setOpenSection(s => (s === 1 ? null : 1))}>

          {/* Image upload */}
          <div className="mb-5">
            <label className={labelCls}>{t('step1.photo_label')}</label>
            <div
              className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-[var(--brand-border)] bg-brand-tint' : 'border-border hover:border-[var(--brand-border)]'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.open()}
            >
              <svg className="w-10 h-10 mx-auto mb-3 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-faint font-medium">{t('step1.photo_drop')}</p>
              <p className="text-faint text-sm mt-1">{t('step1.photo_hint')}</p>
              <PhotoInputTrigger
                ref={fileInputRef}
                accept="image/*"
                multiple
                onFiles={(files) => addImages(files)}
              />
            </div>
            {images.length > 0 && (
              <div className="flex gap-3 mt-3 flex-wrap">
                {images.map((img) => (
                  <div key={img.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.preview} alt={t('step1.photo_alt')} className="w-20 h-20 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                      className="absolute -top-2 -right-2 bg-danger text-ink rounded-full w-5 h-5 flex items-center justify-center text-xs before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[var(--touch-min)] before:h-[var(--touch-min)]"
                      aria-label={t('step1.photo_del')}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Defect type — 선택사항(AI가 사진 판단). 기본 접힘 + 펼치면 컴팩트 2열 */}
          <div className="mb-4">
            <label className={labelCls}>{t('step1.type_label')}</label>

            {isClassifying && (
              <div className="flex items-center gap-2 mb-2 text-muted text-sm">
                <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t('step1.classifying')}
              </div>
            )}
            {aiSuggested && defectType && (
              <div className="mb-2 text-[length:var(--text-label)] font-medium text-brand-ink bg-brand-tint border border-[var(--brand-border)] rounded-lg px-3 py-1.5">
                {t('step1.ai_suggested')}
              </div>
            )}
            {classifyError && (
              <div className="mb-2 text-[length:var(--text-label)] font-medium text-warn bg-[var(--warn-bg)] border border-[var(--warn-border)] rounded-lg px-3 py-1.5">
                {t('step1.classify_error')}
              </div>
            )}

            {!defectGridOpen ? (
              <div className="flex flex-wrap items-center gap-2">
                {defectType ? (
                  <>
                    <span className="inline-flex items-center px-3 py-2 rounded-full bg-brand text-on-brand text-base font-semibold min-h-[44px]">
                      {t(DEFECT_KEY_MAP[defectType] || defectType)}
                    </span>
                    <button type="button" onClick={() => setDefectGridOpen(true)}
                      className="text-brand hover:text-brand-ink text-base font-medium min-h-[44px] px-2">
                      {t('step1.type_change')}
                    </button>
                    <button type="button" onClick={() => { setDefectType(''); setCustomDefect(''); setAiSuggested(false); setClassifyError(false); }}
                      className="text-faint hover:text-ink text-base min-h-[44px] px-2" aria-label={t('step1.type_clear')}>
                      ×
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setDefectGridOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 min-h-[var(--touch-cta)] px-4 rounded-xl border border-border-strong bg-surface-sunken text-ink font-semibold text-base hover:bg-surface transition-colors">
                    {t('step1.type_select')} <span className="text-faint font-normal">{t('step1.type_optional')}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {DEFECT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const next = defectType === type ? '' : type;
                      setDefectType(next);
                      setAiSuggested(false);   // 사용자 확정이 AI 제안을 덮어씀
                      setClassifyError(false);
                      // 선택 즉시 접기. '기타'는 직접 입력을 위해 펼친 상태 유지.
                      if (next && next !== '기타 (직접 입력)') setDefectGridOpen(false);
                    }}
                    className={`px-3 py-3 rounded-lg text-sm font-medium text-left transition-all border min-h-[44px] flex items-center ${
                      defectType === type
                        ? 'bg-brand text-on-brand border-[var(--brand-border)]'
                        : 'bg-surface-sunken text-muted border-border hover:border-[var(--brand-border)] hover:text-ink'
                    }`}
                  >
                    {t(DEFECT_KEY_MAP[type] || type)}
                  </button>
                ))}
              </div>
            )}

            {defectType === '기타 (직접 입력)' && (
              <>
                <input
                  ref={customDefectInputRef}
                  type="text"
                  className={`${inputCls} mt-2 ${customDefect.trim() === '' ? 'border border-[var(--warn-border)]' : ''}`}
                  placeholder={t('step1.type_custom')}
                  value={customDefect}
                  onChange={(e) => setCustomDefect(e.target.value)}
                />
                {customDefect.trim() === '' && (
                  <p className="mt-1 text-[length:var(--text-label)] text-warn">{t('step1.type_custom_required')}</p>
                )}
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>{t('step1.desc_label')}</label>
            <textarea
              className={`${inputCls} h-24 resize-none`}
              placeholder={t('step1.desc_placeholder')}
              value={defectDescription}
              onChange={(e) => setDefectDescription(e.target.value)}
            />
            <p className="mt-1.5 text-[length:var(--text-label)] text-faint">{t('step1.desc_hint')}</p>
          </div>
        </FormSection>

        {/* STEP 2: Resin Info */}
        <FormSection step={2} title={t('step2.title')} open={openSection === 2}
          complete={!!(resinType || customResin)}
          onToggle={() => setOpenSection(s => (s === 2 ? null : 2))}>
          {/* 📷 포대 라벨 사진 자동 입력 */}
          <button
            type="button"
            onClick={() => gradeImageRef.current?.open()}
            disabled={gradeImgBusy}
            className="w-full mb-3 flex items-center justify-center gap-2 min-h-[var(--touch-cta)] rounded-xl border border-border-strong bg-surface-sunken text-ink font-semibold text-body hover:bg-surface disabled:opacity-50 transition-colors"
          >
            {gradeImgBusy ? t('grade.photo_busy') : `📷 ${t('grade.label_button')}`}
          </button>
          <PhotoInputTrigger
            ref={gradeImageRef}
            accept="image/*"
            onFiles={(files) => files[0] && handleLabelImage(files[0])}
          />

          {/* 그레이드명 우선 입력 + 자동 입력(추정) */}
          <div className="mb-4">
            <label className={labelCls}>{t('step2.grade_label')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                className={`${inputCls} flex-1`}
                placeholder={t('step2.grade_placeholder')}
                value={resinGrade}
                onChange={(e) => setResinGrade(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAutoFillGrade(); } }}
              />
              <button
                type="button"
                onClick={handleAutoFillGrade}
                disabled={gradeBusy || !resinGrade.trim()}
                className="shrink-0 min-h-[var(--touch-cta)] px-4 rounded-xl bg-brand text-on-brand font-bold text-sm hover:bg-brand-ink disabled:opacity-50 transition-colors"
              >
                {gradeBusy ? t('grade.busy') : t('grade.autofill')}
              </button>
            </div>
            {gradeStatus && (
              <div className={`mt-2 rounded-xl px-3 py-2 text-body ${gradeStatus.tone === 'brand'
                ? 'bg-brand-tint text-brand-ink border border-[var(--brand-border)]'
                : 'bg-[var(--warn-bg)] text-warn border border-[var(--warn-border)]'}`}>
                {gradeStatus.text}
              </div>
            )}
          </div>

          {/* 수기 입력 그룹 — 기본 접힘, 토글·자동채움·임시저장값이면 펼침 */}
          {!manualResinOpen ? (
            <button
              type="button"
              onClick={() => setManualResinOpen(true)}
              className="w-full text-left text-body text-brand hover:text-brand-ink min-h-[var(--touch-min)] flex items-center gap-1"
            >
              {t('grade.manual_toggle')}
            </button>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('step2.resin_label')} <span className="text-danger">*</span></label>
                <select
                  className={selectCls}
                  value={resinType}
                  onChange={(e) => setResinType(e.target.value)}
                >
                  <option value="">{t('step2.resin_placeholder')}</option>
                  {RESIN_OPTIONS.map(group => (
                    <optgroup key={group.group} label={t(group.groupKey)}>
                      {group.options.map(opt => (
                        <option key={opt} value={opt}>
                          {opt === '기타 (직접 입력)'
                            ? t('resin.custom_option')
                            : locale === 'en'
                              ? (RESIN_OPTION_EN_LABEL[opt] ?? opt)
                              : opt}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {resinType === '기타 (직접 입력)' && (
                  <input type="text" className={`${inputCls} mt-2`} placeholder={t('step2.resin_custom')} value={customResin} onChange={(e) => setCustomResin(e.target.value)} />
                )}
              </div>
              <div>
                <label className={labelCls}>{t('step2.filler_label')}</label>
                <select className={selectCls} value={filler} onChange={(e) => setFiller(e.target.value)}>
                  {fillerOptions.map(([val, key]) => <option key={val} value={val}>{t(key)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('step2.filler_pct')}</label>
                <input type="text" inputMode="numeric" className={inputCls} placeholder={t('step2.filler_placeholder')} value={fillerContent} onChange={(e) => setFillerContent(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t('step2.fr_label')}</label>
                <select className={selectCls} value={flameRetardant} onChange={(e) => setFlameRetardant(e.target.value)}>
                  {['없음', 'UL94 V-0', 'UL94 V-1', 'UL94 V-2', 'UL94 HB', 'UL94 5VA', 'UL94 5VB'].map(val => (
                    <option key={val} value={val}>{val === '없음' ? t('common.none') : val}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('step2.fr_thickness')}</label>
                <select className={selectCls} value={flameRetardantThickness} onChange={(e) => setFlameRetardantThickness(e.target.value)}>
                  {['미입력', '0.4', '0.75', '0.8', '1.0', '1.5', '1.6', '2.0', '3.0', '3.2'].map(val => (
                    <option key={val} value={val}>{val === '미입력' ? t('step2.fr_thickness_default') : val}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('step2.fr_type')}</label>
                <select className={selectCls} value={flameRetardantType} onChange={(e) => setFlameRetardantType(e.target.value)}>
                  {frTypeOptions.map(([val, key]) => <option key={val} value={val}>{t(key)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('step2.detail_label')}</label>
                <input type="text" className={inputCls} placeholder={t('step2.detail_placeholder')} value={resinDetail} onChange={(e) => setResinDetail(e.target.value)} />
              </div>
            </div>
          )}
        </FormSection>

        {/* STEP 3: Machine Settings */}
        <FormSection step={3} title={t('step3.title')} open={openSection === 3}
          complete={!!(settings.nozzleTemp || settings.zone1Temp || settings.injPressure1 || settings.holdPressure || settings.injSpeed1)}
          onToggle={() => setOpenSection(s => (s === 3 ? null : 3))}>

          {/* Camera auto-fill */}
          <div className="mb-5">
            {/* 불량 업로더와 동일한 점선 드래그박스 — 클릭/드래그/Ctrl+V/카메라. 현장 발견성 위해 brand 톤 강조 */}
            <div
              role="button"
              tabIndex={0}
              aria-disabled={isExtractingSettings}
              onClick={() => { if (!isExtractingSettings && settingsImages.length < 5) settingsImageRef.current?.open(); }}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isExtractingSettings && settingsImages.length < 5) { e.preventDefault(); settingsImageRef.current?.open(); } }}
              onDragOver={(e) => { e.preventDefault(); if (!isExtractingSettings && settingsImages.length < 5) setIsDraggingSettings(true); }}
              onDragLeave={() => setIsDraggingSettings(false)}
              onDrop={(e) => { e.preventDefault(); setIsDraggingSettings(false); if (!isExtractingSettings && settingsImages.length < 5 && e.dataTransfer.files.length) addSettingsImages(e.dataTransfer.files); }}
              className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center transition-colors min-h-[56px] ${isExtractingSettings ? 'cursor-default opacity-80' : 'cursor-pointer'} ${isDraggingSettings ? 'border-[var(--brand-border)] bg-brand-tint' : 'border-[var(--brand-border)] hover:bg-brand-tint'}`}
            >
              {isExtractingSettings ? (
                <div className="flex items-center justify-center gap-3 text-brand-ink font-bold text-base">
                  <svg className="animate-spin w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t('step3.camera_loading')}
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 mx-auto mb-2 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <p className="text-brand-ink font-bold text-base">{t('step3.camera_btn')}</p>
                  <p className="text-faint text-[length:var(--text-label)] mt-1">{t('step3.camera_hint')}</p>
                </>
              )}
            </div>
            <PhotoInputTrigger
              ref={settingsImageRef}
              accept="image/*"
              multiple
              onFiles={(files) => { if (files.length) addSettingsImages(files); }}
            />
            {/* 셋팅 사진 썸네일(멀티) — × 삭제 / 재촬영=추가 업로드 */}
            {settingsImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {settingsImages.map((s) => (
                  <div key={s.id} className="relative">
                    <img src={s.preview} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() => removeSettingsImage(s.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-on-brand text-xs font-bold flex items-center justify-center before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[var(--touch-min)] before:h-[var(--touch-min)]"
                      aria-label={t('step3.photo_remove')}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            {extractMsg && (
              <div className={`mt-2 text-sm px-4 py-3 rounded-xl flex items-start gap-2 ${extractMsg.startsWith('✓') ? 'bg-brand-tint border border-[var(--brand-border)] text-brand-ink' : 'bg-[var(--danger-bg)] border border-[var(--danger-border)] text-danger'}`}>
                <span className="shrink-0 mt-0.5">{extractMsg.startsWith('✓') ? '✓' : '!'}</span>
                <span>{extractMsg.startsWith('✓') ? extractMsg.slice(2) : extractMsg}</span>
              </div>
            )}
            {extractedFields.size > 0 && (
              <p className="mt-1.5 text-xs text-brand-ink/60 text-center">{t('step3.extracted_hint')}</p>
            )}
          </div>
          <div className="space-y-5">
            <div>
              <label className={labelCls}>{t('step3.temp_label')}</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {tempZones.map(({ key, label }) => (
                  <div key={key}>
                    <div className={`text-xs mb-1 text-center ${extractedFields.has(key) ? 'text-brand-ink/70 font-semibold' : 'text-faint'}`}>{label}{extractedFields.has(key) && ' ✓'}</div>
                    <input type="text" inputMode="numeric" className={settingInputCls(key)} placeholder="℃" value={settings[key as keyof typeof settings]} onChange={(e) => setSetting(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('step3.mold_temp')}</label>
              <div className="grid grid-cols-2 gap-2">
                {moldTempFields.map(({ key, label }) => (
                  <div key={key}>
                    <div className={`text-xs mb-1 ${extractedFields.has(key) ? 'text-brand-ink/70 font-semibold' : 'text-faint'}`}>{label}{extractedFields.has(key) && ' ✓'}</div>
                    <input type="text" inputMode="numeric" className={settingInputCls(key)} placeholder="℃" value={settings[key as keyof typeof settings]} onChange={(e) => setSetting(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-faint text-sm">{t('step3.pressure_unit')}</span>
              {(['bar', 'MPa'] as const).map(u => (
                <button key={u} type="button"
                  onClick={() => setSettings(prev => ({ ...prev, pressureUnit: u }))}
                  className={`min-h-[44px] px-4 rounded-lg border text-sm font-bold transition-colors ${
                    settings.pressureUnit === u
                      ? 'bg-brand-tint text-brand-ink border-[var(--brand-border)]'
                      : 'bg-surface text-muted border-border hover:border-border-strong'}`}>
                  {u}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {machineParams.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div className={`text-xs mb-1 ${extractedFields.has(key) ? 'text-brand-ink/70 font-semibold' : 'text-faint'}`}>{label}{extractedFields.has(key) && ' ✓'}</div>
                  <input type="text" inputMode="numeric" className={settingInputCls(key)} placeholder={placeholder} value={settings[key as keyof typeof settings]} onChange={(e) => setSetting(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full bg-surface-sunken border border-border rounded-xl px-4 py-3 min-h-[var(--touch-min)] flex items-center justify-between hover:bg-surface-sunken transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <div className="text-left">
                  <div className="text-base font-semibold text-ink">{showAdvanced ? t('adv.toggle_collapse') : t('adv.toggle_expand')}</div>
                  <div className="text-[length:var(--text-label)] text-muted">{t('adv.toggle_hint')}</div>
                </div>
              </div>
              <svg className={`w-4 h-4 transition-transform shrink-0 text-muted ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5 border-t border-border pt-5">

                {/* V/P & Decomp */}
                <div>
                  <div className="text-[length:var(--text-label)] font-bold text-faint uppercase tracking-wider mb-3">{t('adv.vp_section')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'vpTransferPos', label: t('adv.vp_pos'), placeholder: 'mm' },
                      { key: 'vpTransferPressure', label: t('adv.vp_pressure'), placeholder: settings.pressureUnit || 'MPa' },
                      { key: 'preInjectDecompDist', label: t('adv.decomp_pre'), placeholder: 'mm' },
                      { key: 'preInjectDecompSpeed', label: t('adv.decomp_pre_speed'), placeholder: 'mm/s' },
                      { key: 'postMeterDecompDist', label: t('adv.decomp_post'), placeholder: 'mm' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <div className="text-[length:var(--text-label)] text-faint mb-1">{label}</div>
                        <input type="text" inputMode="numeric" className={inputCls} placeholder={placeholder} value={advSettings[key as keyof typeof advSettings]} onChange={(e) => setAdvSetting(key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actual measured values */}
                <div>
                  <div className="text-[length:var(--text-label)] font-bold text-faint uppercase tracking-wider mb-3">{t('adv.actual_section')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'actualFillTime', label: t('adv.fill_time'), placeholder: 'sec' },
                      { key: 'actualPeakPressure', label: t('adv.peak_pressure'), placeholder: settings.pressureUnit || 'MPa' },
                      { key: 'actualCushion', label: t('adv.cushion'), placeholder: 'mm' },
                      { key: 'actualCycleTime', label: t('adv.cycle_time'), placeholder: 'sec' },
                      { key: 'actualPartWeight', label: t('adv.part_weight'), placeholder: 'g' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <div className="text-[length:var(--text-label)] text-faint mb-1">{label}</div>
                        <input type="text" inputMode="numeric" className={inputCls} placeholder={placeholder} value={advSettings[key as keyof typeof advSettings]} onChange={(e) => setAdvSetting(key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Drying */}
                <div>
                  <div className="text-[length:var(--text-label)] font-bold text-faint uppercase tracking-wider mb-3">{t('adv.dry_section')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.dry_temp')}</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="℃" value={advSettings.dryTemp} onChange={(e) => setAdvSetting('dryTemp', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.dry_time')}</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="hr" value={advSettings.dryTime} onChange={(e) => setAdvSetting('dryTime', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.dryer_type')}</div>
                      <select className={selectCls} value={advSettings.dryerType} onChange={(e) => setAdvSetting('dryerType', e.target.value)}>
                        <option value="없음">{t('adv.dryer_none')}</option>
                        <option value="제습식">{t('adv.dryer_dehum')}</option>
                        <option value="열풍식">{t('adv.dryer_hot')}</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.moisture')}</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="%" value={advSettings.moistureContent} onChange={(e) => setAdvSetting('moistureContent', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Hot runner (conditional) */}
                {(moldType === '핫러너' || runnerType === '핫') && (
                  <div>
                    <div className="text-[length:var(--text-label)] font-bold text-faint uppercase tracking-wider mb-3">{t('adv.hr_section')}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'hrManifoldTemp', label: t('adv.hr_manifold') },
                        { key: 'hrNozzle1Temp', label: t('adv.hr_nozzle1') },
                        { key: 'hrNozzle2Temp', label: t('adv.hr_nozzle2') },
                        { key: 'hrNozzle3Temp', label: t('adv.hr_nozzle3') },
                        { key: 'hrNozzle4Temp', label: t('adv.hr_nozzle4') },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <div className="text-[length:var(--text-label)] text-faint mb-1">{label} (℃)</div>
                          <input type="text" inputMode="numeric" className={inputCls} placeholder="℃" value={advSettings[key as keyof typeof advSettings]} onChange={(e) => setAdvSetting(key, e.target.value)} />
                        </div>
                      ))}
                      <div>
                        <div className="text-[length:var(--text-label)] text-faint mb-1">{t('adv.valve_gate')}</div>
                        <select className={selectCls} value={advSettings.valveGate} onChange={(e) => setAdvSetting('valveGate', e.target.value)}>
                          <option value="없음">{t('adv.valve_none')}</option>
                          <option value="있음">{t('adv.valve_yes')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regrind & Color */}
                <div>
                  <div className="text-[length:var(--text-label)] font-bold text-faint uppercase tracking-wider mb-3">{t('adv.regrind_section')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.regrind_ratio')}</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="%" value={advSettings.regrindRatio} onChange={(e) => setAdvSetting('regrindRatio', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.color_type')}</div>
                      <select className={selectCls} value={advSettings.colorType} onChange={(e) => setAdvSetting('colorType', e.target.value)}>
                        <option value="없음">{t('adv.color_none')}</option>
                        <option value="마스터배치">{t('adv.color_mb')}</option>
                        <option value="액상컬러">{t('adv.color_liquid')}</option>
                        <option value="분체컬러">{t('adv.color_powder')}</option>
                      </select>
                    </div>
                    {advSettings.colorType !== '없음' && (
                      <div>
                        <div className="text-[length:var(--text-label)] text-faint mb-1">{t('adv.color_ratio')}</div>
                        <input type="text" inputMode="numeric" className={inputCls} placeholder="%" value={advSettings.mbRatio} onChange={(e) => setAdvSetting('mbRatio', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Machine info */}
                <div>
                  <div className="text-[length:var(--text-label)] font-bold text-faint uppercase tracking-wider mb-3">{t('adv.machine_section')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <div className="text-xs text-muted mb-1">{t('adv.machine_model')}</div>
                      <input type="text" className={inputCls} placeholder={t('adv.machine_model_placeholder')} value={advSettings.machineModel} onChange={(e) => setAdvSetting('machineModel', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.screw_dia')}</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="mm" value={advSettings.screwDiameter} onChange={(e) => setAdvSetting('screwDiameter', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.max_clamp')}</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="ton" value={advSettings.maxClampForce} onChange={(e) => setAdvSetting('maxClampForce', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1">{t('adv.max_pressure')}</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder={settings.pressureUnit || 'MPa'} value={advSettings.maxInjPressure} onChange={(e) => setAdvSetting('maxInjPressure', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{t('adv.heating_method')} <span className="text-faint text-xs">({t('adv.optional')})</span></label>
                    <select className={selectCls} value={advSettings.heatingMethod} onChange={(e) => setAdvSetting('heatingMethod', e.target.value)}>
                      <option value="">{t('adv.heating_none')}</option>
                      <option value="온수기">{t('adv.heating_water')}</option>
                      <option value="온유기">{t('adv.heating_oil')}</option>
                      <option value="카트리지">{t('adv.heating_cartridge')}</option>
                    </select>
                  </div>
                </div>

              </div>
            )}
          </div>
        </FormSection>

        {/* STEP 4: Mold & Product Info */}
        <FormSection step={4} title={t('step4.title')} open={openSection === 4} optional
          complete={!!(moldType || gateType || cavities || runnerType || weight || wallThicknessMin || wallThicknessMax || productNotes)}
          onToggle={() => setOpenSection(s => (s === 4 ? null : 4))}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('step4.mold_type')}</label>
              <select className={selectCls} value={moldType} onChange={(e) => setMoldType(e.target.value)}>
                <option value="">{t('step4.mold_type_default')}</option>
                <option value="2판">{t('step4.mold_2plate')}</option>
                <option value="3판">{t('step4.mold_3plate')}</option>
                <option value="핫러너">{t('step4.mold_hot')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step4.gate_type')}</label>
              <select className={selectCls} value={gateType} onChange={(e) => setGateType(e.target.value)}>
                <option value="">{t('step4.mold_type_default')}</option>
                <option value="사이드">{t('step4.gate_side')}</option>
                <option value="핀포인트">{t('step4.gate_pinpoint')}</option>
                <option value="서브마린">{t('step4.gate_submarine')}</option>
                <option value="다이렉트">{t('step4.gate_direct')}</option>
                <option value="밸브">{t('step4.gate_valve')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step4.cavities')}</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder={t('step4.cavities_placeholder')} value={cavities} onChange={(e) => setCavities(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('step4.runner')}</label>
              <select className={selectCls} value={runnerType} onChange={(e) => setRunnerType(e.target.value)}>
                <option value="">{t('step4.mold_type_default')}</option>
                <option value="콜드">{t('step4.runner_cold')}</option>
                <option value="핫">{t('step4.runner_hot')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step4.weight')}</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder={t('step4.weight_placeholder')} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('step4.wall')}</label>
              <div className="flex gap-2 items-center">
                <input type="text" inputMode="numeric" className={inputCls} placeholder={t('step4.wall_min')} value={wallThicknessMin} onChange={(e) => setWallThicknessMin(e.target.value)} />
                <span className="text-faint">~</span>
                <input type="text" inputMode="numeric" className={inputCls} placeholder={t('step4.wall_max')} value={wallThicknessMax} onChange={(e) => setWallThicknessMax(e.target.value)} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('step4.notes')}</label>
              <input type="text" className={inputCls} placeholder={t('step4.notes_placeholder')} value={productNotes} onChange={(e) => setProductNotes(e.target.value)} />
            </div>

            {/* Mold Drawing Upload */}
            <div className="sm:col-span-2 mt-2">
              <label className={labelCls}>{t('step4.drawing_label')}</label>
              <div
                className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-colors ${
                  isDraggingDrawing ? 'border-[var(--brand-border)] bg-brand-tint' : 'border-border hover:border-[var(--brand-border)]'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingDrawing(true); }}
                onDragLeave={() => setIsDraggingDrawing(false)}
                onDrop={(e) => { e.preventDefault(); setIsDraggingDrawing(false); addMoldDrawings(e.dataTransfer.files); }}
                onClick={() => moldDrawingInputRef.current?.open()}
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-muted text-sm font-medium">{t('step4.drawing_hint')}</p>
                <p className="text-faint text-[length:var(--text-label)] mt-1">{t('step4.drawing_ai_hint')}</p>
                <PhotoInputTrigger
                  ref={moldDrawingInputRef}
                  accept="image/*,application/pdf"
                  multiple
                  onFiles={(files) => addMoldDrawings(files)}
                />
              </div>
              {moldDrawings.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {moldDrawings.map((d) => (
                    <div key={d.id} className="relative flex items-center gap-2 bg-surface-sunken rounded-lg px-2 py-2 border border-border">
                      {d.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.preview} alt={t('step4.drawing_alt')} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-danger/20 rounded flex items-center justify-center text-xs font-bold text-danger">PDF</div>
                      )}
                      <span className="text-[length:var(--text-label)] text-muted max-w-[80px] truncate">{d.file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMoldDrawings(prev => prev.filter(x => x.id !== d.id)); }}
                        className="ml-auto min-w-[44px] min-h-[44px] flex items-center justify-center text-faint hover:text-danger transition-colors"
                        aria-label={t('step4.drawing_del')}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FormSection>

        {error && (
          <div ref={errorRef} className="bg-[var(--danger-bg)] border border-[var(--danger-border)] text-danger rounded-xl p-4 text-base">
            {error}
          </div>
        )}

        {/* 진단 진행 카드 */}
        {progressVisible && (
          <div ref={progressCardRef}>
            <DiagnoseProgress
              isLoading={isLoading}
              hasResult={!!result}
              hasPhoto={images.length > 0}
              onExitComplete={() => setProgressVisible(false)}
            />
          </div>
        )}

        {/* Results */}
        {result && (
          <div ref={resultRef}>
            <DiagnosisResultPanel
              result={result}
              onSavePDF={handleSavePDF}
              round={round}
              followUpHistory={followUpHistory}
              onResolved={handleResolved}
              onResolvedWithStatus={handleResolvedWithStatus}
              onStartFollowUp={handleStartFollowUp}
              resinType={resinType === '기타 (직접 입력)' ? customResin : resinType}
              machineSettings={{ ...settings, ...advSettings }}
              sessionId={sessionId}
              defectPhotos={result.beforePhoto ? [result.beforePhoto] : images.map(img => img.base64)}
              pdfExporting={pdfExporting}
            />
          </div>
        )}

        {/* Follow-up Form */}
        {showFollowUpForm && result &&
         result.defect_type?.en !== 'Image_Unreadable' &&
         result.defect_type?.en !== 'No_Defect_Detected' && (
          <div ref={followUpFormRef} className="bg-surface rounded-2xl p-4 sm:p-6 border-2 border-[var(--brand-border)] space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-tint text-brand-ink text-xs font-bold px-2 py-1 rounded-full">{round}{t('followup.badge')}</span>
              <h3 className="text-lg font-bold text-ink">{t('followup.title')}</h3>
            </div>

            {/* Action checklist */}
            <div>
              <label className={labelCls}>{t('followup.actions_label')}</label>
              <div className="space-y-2 mt-1">
                {followUpActions.map((action, i) => (
                  <div key={i} className="border border-border rounded-xl p-3">
                    <label className="flex items-start gap-3 cursor-pointer min-h-[44px] py-1">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-6 h-6 rounded accent-[var(--brand)] shrink-0"
                        checked={action.done}
                        onChange={() => setFollowUpActions(prev => prev.map((a, j) => j === i ? { ...a, done: !a.done } : a))}
                      />
                      <span className={`text-base flex-1 leading-snug ${action.done ? 'text-muted font-medium' : 'text-muted'}`}>{action.recommendation}</span>
                    </label>
                    {action.done && (
                      <select
                        className="mt-2 ml-9 text-base border border-border rounded-lg px-3 py-2.5 bg-surface-sunken text-ink min-h-[44px] w-full"
                        value={action.result}
                        onChange={(e) => setFollowUpActions(prev => prev.map((a, j) => j === i ? { ...a, result: e.target.value } : a))}
                      >
                        <option value="">{t('followup.result_default')}</option>
                        <option value="완전 해결">{t('followup.result_resolved')}</option>
                        <option value="부분 개선">{t('followup.result_partial')}</option>
                        <option value="변화 없음">{t('followup.result_unchanged')}</option>
                        <option value="오히려 악화">{t('followup.result_worse')}</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overall change */}
            <div>
              <label className={labelCls}>{t('followup.change_label')}</label>
              <select className={selectCls} value={followUpChange} onChange={(e) => setFollowUpChange(e.target.value)}>
                <option value="">{t('followup.change_default')}</option>
                <option value="개선됨 (빈도 줄었지만 아직 발생)">{t('followup.change_improved')}</option>
                <option value="변화 없음">{t('followup.result_unchanged')}</option>
                <option value="오히려 악화됨">{t('followup.result_worse')}</option>
                <option value="다른 불량이 새로 발생">{t('followup.change_new_defect')}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>{t('followup.notes_label')}</label>
              <textarea
                className={`${inputCls} h-20 resize-none`}
                placeholder={t('followup.notes_placeholder')}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
              />
            </div>

            {/* Follow-up photo */}
            <div>
              <label className={labelCls}>{t('followup.photo_label')}</label>
              <div
                className="border-2 border-dashed border-border-strong rounded-xl p-4 text-center cursor-pointer hover:border-[var(--brand-border)] transition-colors min-h-[80px] flex flex-col items-center justify-center"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) addFollowUpImages(files);
                  };
                  input.click();
                }}
              >
                <p className="text-base text-muted">{t('followup.photo_click')}</p>
                {followUpImages.length > 0 && (
                  <div className="flex gap-2 mt-2 justify-center flex-wrap">
                    {followUpImages.map(img => (
                      <div key={img.id} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.preview} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setFollowUpImages(prev => prev.filter(i => i.id !== img.id)); }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-ink rounded-full text-xs flex items-center justify-center before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[var(--touch-min)] before:h-[var(--touch-min)]"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Settings hint */}
            <div className="bg-surface-sunken rounded-xl p-3 border border-border">
              <p className="text-[length:var(--text-label)] text-faint font-medium">{t('followup.settings_hint')}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowFollowUpForm(false); setRound(prev => Math.max(1, prev - 1)); }}
                className="px-4 py-3 rounded-xl border border-border-strong text-muted text-base font-medium hover:bg-surface-sunken transition-colors min-h-[var(--touch-cta)]"
              >
                {t('submit.cancel')}
              </button>
              <button
                type="button"
                onClick={handleFollowUpSubmit}
                disabled={isLoading}
                className="flex-1 bg-brand hover:bg-brand-ink disabled:opacity-50 text-on-brand font-bold py-3 px-6 rounded-xl transition-colors min-h-[var(--touch-cta)] text-base"
              >
                {isLoading ? t('submit.analyzing') : `${round}${t('submit.followup')}`}
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* 하단 sticky 진단하기 바 (입력 단계에만) */}
      {!result && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)]">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0 text-sm leading-tight">
              {!effectiveDefectType
                ? <span className="text-warn font-medium">{t('step1.defect_required_gate')}</span>
                : user
                  ? (
                    <span className="text-faint flex items-center gap-1 flex-wrap">
                      {t('nav.credits')} <span className="font-bold text-ink tabular-nums">{credits ?? 5}</span>
                      <span className="text-faint">·</span>
                      <Link href="/pricing" className="text-brand-ink font-bold">{t('nav.topup')}</Link>
                    </span>
                  )
                  : <span className="text-faint">{t('sticky.login_hint')}</span>}
            </div>
            <button
              type="button"
              onClick={handleDiagnose}
              disabled={isLoading || !effectiveDefectType}
              className="ui-cta shrink-0 px-6 text-body gap-2 disabled:bg-surface-sunken disabled:text-faint"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('submit.loading')}
                </>
              ) : t('submit.start')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>}>
      <DiagnoseContent />
    </Suspense>
  );
}
