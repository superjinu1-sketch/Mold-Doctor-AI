'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DiagnosisResultPanel from '@/components/DiagnosisResultPanel';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { authHeaders } from '@/lib/supabase/authHeader';
import { downscaleImageClient, safeLocalStorageSet } from '@/lib/clientDownscale';

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
  }[];
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
  { group: '슈퍼 엔지니어링 플라스틱', groupKey: 'resin.group.super_eng', options: ['PPS', 'LCP', 'PEEK', 'PEI(Ultem)', 'PAI', 'PI(폴리이미드)', 'PSU', 'PPSU', 'PES', 'PTFE', 'FEP', 'PFA', 'ETFE'] },
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
    metering: '85', cushion: '5', backPressure: '5', screwRpm: '80', clampForce: '',
    moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '콜드', weight: '45', wallThicknessMin: '1.5', wallThicknessMax: '3.0',
  },
];


// --- Main Diagnose Content ---
function DiagnoseContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [images, setImages] = useState<ImageFile[]>([]);
  const [defectType, setDefectType] = useState('');
  const [customDefect, setCustomDefect] = useState('');
  const [defectDescription, setDefectDescription] = useState('');
  const [resinType, setResinType] = useState('');
  const [customResin, setCustomResin] = useState('');
  const [filler, setFiller] = useState('없음');
  const [fillerContent, setFillerContent] = useState('');
  const [flameRetardant, setFlameRetardant] = useState('없음');
  const [flameRetardantThickness, setFlameRetardantThickness] = useState('미입력');
  const [flameRetardantType, setFlameRetardantType] = useState('해당없음');
  const [resinDetail, setResinDetail] = useState('');
  const [resinGrade, setResinGrade] = useState('');
  const [settings, setSettings] = useState({
    nozzleTemp: '', zone1Temp: '', zone2Temp: '', zone3Temp: '', zone4Temp: '',
    moldTempFixed: '', moldTempMoving: '',
    injPressure1: '', holdPressure: '',
    injSpeed1: '', injSpeed2: '',
    holdTime: '', coolTime: '', injTime: '',
    metering: '', cushion: '', backPressure: '', screwRpm: '', clampForce: '',
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
  const [isExtractingSettings, setIsExtractingSettings] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsImageRef = useRef<HTMLInputElement>(null);
  const moldDrawingInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const followUpFormRef = useRef<HTMLDivElement>(null);

  // Computed label arrays (use t() — must be inside component)
  const machineParams = [
    { key: 'injPressure1', label: t('step3.inj_pressure'), placeholder: 'MPa' },
    { key: 'holdPressure', label: t('step3.hold_pressure'), placeholder: 'MPa' },
    { key: 'injSpeed1', label: t('step3.inj_speed1'), placeholder: '%' },
    { key: 'injSpeed2', label: t('step3.inj_speed2'), placeholder: '%' },
    { key: 'holdTime', label: t('step3.hold_time'), placeholder: 'sec' },
    { key: 'coolTime', label: t('step3.cool_time'), placeholder: 'sec' },
    { key: 'injTime', label: t('step3.inj_time'), placeholder: 'sec' },
    { key: 'metering', label: t('step3.metering'), placeholder: 'mm' },
    { key: 'cushion', label: t('step3.cushion'), placeholder: 'mm' },
    { key: 'backPressure', label: t('step3.back_pressure'), placeholder: 'MPa' },
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

  const handleSettingsImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsExtractingSettings(true);
    setExtractMsg('');
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/extract-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: { data: base64, mediaType: file.type } }),
      });
      if (!res.ok) throw new Error(t('err.extract_fail'));
      const extracted = await res.json();
      const filledKeys: string[] = [];
      setSettings(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(extracted)) {
          if (key in updated && extracted[key]) {
            (updated as Record<string, string>)[key] = extracted[key];
            filledKeys.push(key);
          }
        }
        return updated;
      });
      setExtractedFields(new Set(filledKeys));
      setExtractMsg(`✓ ${filledKeys.length}${t('msg.extracted')}`);
    } catch {
      setExtractMsg(t('err.extract_fail'));
    } finally {
      setIsExtractingSettings(false);
    }
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
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = useCallback(async (file: File): Promise<ImageFile | null> => {
    if (!file.type.startsWith('image/')) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve({
          id: Math.random().toString(36).slice(2),
          file,
          preview: dataUrl,
          base64,
          mediaType: file.type,
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const addMoldDrawings = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    const processed = await Promise.all(fileArray.map(processFile));
    const valid = processed.filter(Boolean) as ImageFile[];
    setMoldDrawings(prev => [...prev, ...valid].slice(0, 3));
  }, [processFile]);

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const processed = await Promise.all(fileArray.map(processFile));
    const valid = processed.filter(Boolean) as ImageFile[];
    setImages(prev => [...prev, ...valid].slice(0, 5));
  }, [processFile]);

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
    if (imageFiles.length > 0) addImages(imageFiles);
  }, [addImages]);

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
    const effectiveResin = resinType === '기타 (직접 입력)' ? customResin : resinType;
    if (!effectiveResin) {
      setError(t('err.resin_required'));
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

      const res = await fetch('/api/diagnose', {
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

      const data = await res.json();
      data.tier = diagnosisTier;
      data.round = diagnosisRound;
      if (newSessionId) data.session_id = newSessionId;
      setResult(data);
      setShowFollowUpForm(false);

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
        };
        history.unshift(record);
        const trimmed = history.slice(0, 20);
        if (!safeLocalStorageSet('diagnoseHistory', JSON.stringify(trimmed))) {
          // QuotaExceeded: retry without images
          trimmed.forEach((r: Record<string, unknown>) => { delete r.beforePhoto; delete r.afterPhoto; });
          safeLocalStorageSet('diagnoseHistory', JSON.stringify(trimmed));
        }
        // 비동기: 첫 번째 불량 사진을 축소해 beforePhoto로 추가 저장
        if (images.length > 0) {
          downscaleImageClient(images[0].base64, 400).then(thumb => {
            try {
              const r2 = localStorage.getItem('diagnoseHistory');
              const h2 = JSON.parse(r2 || '[]');
              const idx = h2.findIndex((h: { id: string }) => h.id === newId);
              if (idx !== -1) {
                h2[idx].beforePhoto = thumb;
                safeLocalStorageSet('diagnoseHistory', JSON.stringify(h2));
              }
            } catch { /* ignore */ }
          });
        }
      } catch { /* ignore */ }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err.estimate_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePDF = async () => {
    if (!result) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const el = resultRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`mold-doctor-${result.defect_type.en.replace(/\s/g, '-')}-${Date.now()}.pdf`);
    } catch {
      alert(t('err.pdf_error'));
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

  const inputCls = "w-full bg-surface-sunken border border-border rounded-lg px-3 py-3 text-base text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-[var(--brand-border)] min-h-[var(--touch-min)]";
  const labelCls = "block text-sm font-medium text-muted mb-1.5";
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

      <div className="space-y-6">
        {/* STEP 1: Defect Info */}
        <section className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
          <h2 className="text-lg font-bold text-ink mb-5 flex items-center gap-2">
            <span className="bg-brand text-on-brand w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            {t('step1.title')}
          </h2>

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
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-10 h-10 mx-auto mb-3 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-faint font-medium">{t('step1.photo_drop')}</p>
              <p className="text-faint text-sm mt-1">{t('step1.photo_hint')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files && addImages(e.target.files)}
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
                      className="absolute -top-2 -right-2 bg-danger text-ink rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      aria-label={t('step1.photo_del')}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Defect type */}
          <div className="mb-4">
            <label className={labelCls}>{t('step1.type_label')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {DEFECT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDefectType(defectType === type ? '' : type)}
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
            {defectType === '기타 (직접 입력)' && (
              <input
                type="text"
                className={`${inputCls} mt-2`}
                placeholder={t('step1.type_custom')}
                value={customDefect}
                onChange={(e) => setCustomDefect(e.target.value)}
              />
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
        </section>

        {/* STEP 2: Resin Info */}
        <section className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
          <h2 className="text-lg font-bold text-ink mb-5 flex items-center gap-2">
            <span className="bg-brand text-on-brand w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            {t('step2.title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('step2.resin_label')} <span className="text-danger">*</span></label>
              <select
                className={inputCls}
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
              <select className={inputCls} value={filler} onChange={(e) => setFiller(e.target.value)}>
                {fillerOptions.map(([val, key]) => <option key={val} value={val}>{t(key)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step2.filler_pct')}</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder={t('step2.filler_placeholder')} value={fillerContent} onChange={(e) => setFillerContent(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('step2.fr_label')}</label>
              <select className={inputCls} value={flameRetardant} onChange={(e) => setFlameRetardant(e.target.value)}>
                {['없음', 'UL94 V-0', 'UL94 V-1', 'UL94 V-2', 'UL94 HB', 'UL94 5VA', 'UL94 5VB'].map(val => (
                  <option key={val} value={val}>{val === '없음' ? t('common.none') : val}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step2.fr_thickness')}</label>
              <select className={inputCls} value={flameRetardantThickness} onChange={(e) => setFlameRetardantThickness(e.target.value)}>
                {['미입력', '0.4', '0.75', '0.8', '1.0', '1.5', '1.6', '2.0', '3.0', '3.2'].map(val => (
                  <option key={val} value={val}>{val === '미입력' ? t('step2.fr_thickness_default') : val}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step2.fr_type')}</label>
              <select className={inputCls} value={flameRetardantType} onChange={(e) => setFlameRetardantType(e.target.value)}>
                {frTypeOptions.map(([val, key]) => <option key={val} value={val}>{t(key)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step2.detail_label')}</label>
              <input type="text" className={inputCls} placeholder={t('step2.detail_placeholder')} value={resinDetail} onChange={(e) => setResinDetail(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('step2.grade_label')}</label>
              <input type="text" className={inputCls} placeholder={t('step2.grade_placeholder')} value={resinGrade} onChange={(e) => setResinGrade(e.target.value)} />
            </div>
          </div>
        </section>

        {/* STEP 3: Machine Settings */}
        <section className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span className="bg-brand text-on-brand w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
            {t('step3.title')}
          </h2>

          {/* Camera auto-fill */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => settingsImageRef.current?.click()}
              disabled={isExtractingSettings}
              className="w-full flex items-center justify-center gap-3 bg-brand hover:bg-brand/90 active:bg-brand/80 disabled:bg-surface-sunken text-on-brand disabled:text-faint font-bold text-base py-4 rounded-xl transition-colors shadow-sm min-h-[56px]"
            >
              {isExtractingSettings ? (
                <>
                  <svg className="animate-spin w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t('step3.camera_loading')}
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span>{t('step3.camera_btn')}</span>
                  <span className="text-on-brand/50 text-sm font-normal hidden sm:inline">{t('step3.camera_btn_count')}</span>
                </>
              )}
            </button>
            <input
              ref={settingsImageRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleSettingsImage(e.target.files[0])}
            />
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
              className="flex items-center gap-2 text-sm font-medium text-muted hover:text-muted transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showAdvanced ? t('adv.toggle_collapse') : t('adv.toggle_expand')}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5 border-t border-border pt-5">

                {/* V/P & Decomp */}
                <div>
                  <div className="text-[length:var(--text-label)] font-bold text-faint uppercase tracking-wider mb-3">{t('adv.vp_section')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'vpTransferPos', label: t('adv.vp_pos'), placeholder: 'mm' },
                      { key: 'vpTransferPressure', label: t('adv.vp_pressure'), placeholder: 'MPa' },
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
                      { key: 'actualPeakPressure', label: t('adv.peak_pressure'), placeholder: 'MPa' },
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
                      <select className={inputCls} value={advSettings.dryerType} onChange={(e) => setAdvSetting('dryerType', e.target.value)}>
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
                        <select className={inputCls} value={advSettings.valveGate} onChange={(e) => setAdvSetting('valveGate', e.target.value)}>
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
                      <select className={inputCls} value={advSettings.colorType} onChange={(e) => setAdvSetting('colorType', e.target.value)}>
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
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="MPa" value={advSettings.maxInjPressure} onChange={(e) => setAdvSetting('maxInjPressure', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{t('adv.heating_method')} <span className="text-faint text-xs">({t('adv.optional')})</span></label>
                    <select className={inputCls} value={advSettings.heatingMethod} onChange={(e) => setAdvSetting('heatingMethod', e.target.value)}>
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
        </section>

        {/* STEP 4: Mold & Product Info */}
        <section className="bg-surface rounded-2xl p-4 sm:p-6 border border-border">
          <h2 className="text-lg font-bold text-ink mb-5 flex items-center gap-2">
            <span className="bg-surface-sunken text-muted w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            {t('step4.title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('step4.mold_type')}</label>
              <select className={inputCls} value={moldType} onChange={(e) => setMoldType(e.target.value)}>
                <option value="">{t('step4.mold_type_default')}</option>
                <option value="2판">{t('step4.mold_2plate')}</option>
                <option value="3판">{t('step4.mold_3plate')}</option>
                <option value="핫러너">{t('step4.mold_hot')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('step4.gate_type')}</label>
              <select className={inputCls} value={gateType} onChange={(e) => setGateType(e.target.value)}>
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
              <select className={inputCls} value={runnerType} onChange={(e) => setRunnerType(e.target.value)}>
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
                onClick={() => moldDrawingInputRef.current?.click()}
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-muted text-sm font-medium">{t('step4.drawing_hint')}</p>
                <p className="text-faint text-[length:var(--text-label)] mt-1">{t('step4.drawing_ai_hint')}</p>
                <input
                  ref={moldDrawingInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && addMoldDrawings(e.target.files)}
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
        </section>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleDiagnose}
          disabled={isLoading}
          className="w-full bg-brand hover:bg-brand/90 disabled:bg-surface-sunken disabled:text-faint text-on-brand py-4 rounded-xl font-bold text-xl transition-colors shadow-lg flex items-center justify-center gap-3 min-h-[var(--touch-cta)]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('submit.loading')}
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {t('submit.start')}
            </>
          )}
        </button>

        {error && (
          <div className="bg-[var(--danger-bg)] border border-[var(--danger-border)] text-danger rounded-xl p-4 text-base">
            {error}
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
            />
          </div>
        )}

        {/* Follow-up Form */}
        {showFollowUpForm && result &&
         result.defect_type?.en !== 'Image_Unreadable' &&
         result.defect_type?.en !== 'No_Defect_Detected' && (
          <div ref={followUpFormRef} className="bg-surface rounded-2xl p-4 sm:p-6 border-2 border-[var(--warn-border)] space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-warn text-ink text-xs font-bold px-2 py-1 rounded-full">{round}{t('followup.badge')}</span>
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
              <select className={inputCls} value={followUpChange} onChange={(e) => setFollowUpChange(e.target.value)}>
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
                          className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-ink rounded-full text-xs flex items-center justify-center"
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
                className="flex-1 bg-warn hover:brightness-90 disabled:opacity-50 text-ink font-bold py-3 px-6 rounded-xl transition-colors min-h-[var(--touch-cta)] text-base"
              >
                {isLoading ? t('submit.analyzing') : `${round}${t('submit.followup')}`}
              </button>
            </div>
          </div>
        )}
      </div>
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
