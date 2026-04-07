'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DiagnosisResultPanel from '@/components/DiagnosisResultPanel';

// --- Types ---
interface ImageFile {
  id: string;
  file: File;
  preview: string;
  base64: string;
  mediaType: string;
}

interface DiagnosisResult {
  defect_type: { ko: string; en: string };
  defect_phase?: 'filling' | 'packing' | 'cooling' | 'material';
  severity: 'high' | 'medium' | 'low';
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
}

// --- Constants ---
const DEFECT_TYPES = [
  '미성형 (Short Shot)', '플래시 (Flash)', '싱크마크 (Sink Mark)', '웰드라인 (Weld Line)',
  '버닝/가스마크 (Burn Mark)', '은줄 (Silver Streak)', '변색 (Discoloration)', '크랙 (Crack)',
  '휨/변형 (Warpage)', '기포 (Void/Bubble)', '젯팅 (Jetting)', '기타 (직접 입력)',
];

const RESIN_OPTIONS = [
  { group: '폴리아미드 (나일론)', options: ['PA6', 'PA66', 'PA46', 'PA6T', 'PA9T', 'PA10T', 'PA12T', 'PA12', 'PA610', 'PA612', 'PA1010', 'PA6/66', 'MXD6'] },
  { group: '폴리에스터', options: ['PBT', 'PET', 'PCT', 'PEN'] },
  { group: '엔지니어링 플라스틱 기타', options: ['PC', 'POM(아세탈)', 'PPE/PPO', 'm-PPE'] },
  { group: '슈퍼 엔지니어링 플라스틱', options: ['PPS', 'LCP', 'PEEK', 'PEI(Ultem)', 'PAI', 'PI(폴리이미드)', 'PSU', 'PPSU', 'PES', 'PTFE', 'FEP', 'PFA', 'ETFE'] },
  { group: '범용 플라스틱', options: ['PP', 'PE(HDPE)', 'PE(LDPE)', 'PE(LLDPE)', 'PS', 'ABS', 'SAN', 'ASA', 'PMMA(아크릴)', 'PVC'] },
  { group: '블렌드/알로이', options: ['PC/ABS', 'PC/PBT', 'PA/ABS', 'PA/PP', 'PPE/PA', 'PBT/ABS'] },
  { group: '엘라스토머/TPE', options: ['TPU', 'TPE', 'TPC', 'TPA', 'TPEE', 'TPV', 'TPO'] },
  { group: '기타', options: ['기타 (직접 입력)'] },
];

const SAMPLE_CASES = [
  {
    label: 'PA66 GF33% — 은줄',
    defectType: '은줄 (Silver Streak)',
    defectDescription: '제품 표면에 은색 줄무늬 발생. 5샷에 1번꼴, 게이트 부근에서 시작됨.',
    resinType: 'PA66', filler: 'GF(유리섬유)', fillerContent: '33', flameRetardant: '없음', flameRetardantThickness: '미입력', flameRetardantType: '해당없음', resinDetail: 'PA66 GF33%', resinGrade: '',
    nozzleTemp: '285', zone1Temp: '280', zone2Temp: '275', zone3Temp: '265', zone4Temp: '255',
    moldTempFixed: '80', moldTempMoving: '80', injPressure1: '120', holdPressure: '80',
    injSpeed1: '60', injSpeed2: '40', holdTime: '8', coolTime: '15', injTime: '3',
    metering: '85', cushion: '5', backPressure: '5', screwRpm: '80', clampForce: '',
    moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '콜드', weight: '45', wallThicknessMin: '1.5', wallThicknessMax: '3.0',
  },
  {
    label: 'PC — 크랙',
    defectType: '크랙 (Crack)',
    defectDescription: '이젝터 핀 주변에 크랙 발생. 이형 후 2~3분 내에 나타남. 투명 PC 제품.',
    resinType: 'PC', filler: '없음', fillerContent: '', flameRetardant: 'UL94 V-0', flameRetardantThickness: '1.6', flameRetardantType: '할로겐프리', resinDetail: 'PC 투명', resinGrade: 'Covestro Makrolon 2405',
    nozzleTemp: '310', zone1Temp: '305', zone2Temp: '295', zone3Temp: '285', zone4Temp: '275',
    moldTempFixed: '90', moldTempMoving: '85', injPressure1: '150', holdPressure: '120',
    injSpeed1: '70', injSpeed2: '50', holdTime: '12', coolTime: '25', injTime: '4',
    metering: '60', cushion: '4', backPressure: '8', screwRpm: '60', clampForce: '180',
    moldType: '2판', gateType: '핀포인트', cavities: '2', runnerType: '핫', weight: '120', wallThicknessMin: '2.0', wallThicknessMax: '4.0',
  },
  {
    label: 'POM — 싱크마크',
    defectType: '싱크마크 (Sink Mark)',
    defectDescription: '보스(boss) 반대면 표면에 싱크마크 발생. 두께 4mm 구간 집중.',
    resinType: 'POM(아세탈)', filler: '없음', fillerContent: '', flameRetardant: '없음', flameRetardantThickness: '미입력', flameRetardantType: '해당없음', resinDetail: 'POM Homo', resinGrade: 'Polyplastics Duracon M90',
    nozzleTemp: '200', zone1Temp: '195', zone2Temp: '190', zone3Temp: '185', zone4Temp: '180',
    moldTempFixed: '90', moldTempMoving: '90', injPressure1: '130', holdPressure: '100',
    injSpeed1: '55', injSpeed2: '35', holdTime: '15', coolTime: '30', injTime: '5',
    metering: '70', cushion: '6', backPressure: '6', screwRpm: '70', clampForce: '120',
    moldType: '3판', gateType: '핀포인트', cavities: '8', runnerType: '콜드', weight: '30', wallThicknessMin: '2.5', wallThicknessMax: '4.5',
  },
  {
    label: 'PP GF20% — 휨/변형',
    defectType: '휨/변형 (Warpage)',
    defectDescription: '냉각 후 평판형 제품이 대각선 방향으로 1.5mm 이상 휨. 4캐비티 중 유독 2번 캐비티에서 심함.',
    resinType: 'PP', filler: 'GF(유리섬유)', fillerContent: '20', flameRetardant: '없음', flameRetardantThickness: '미입력', flameRetardantType: '해당없음', resinDetail: 'PP GF20%', resinGrade: '',
    nozzleTemp: '240', zone1Temp: '235', zone2Temp: '228', zone3Temp: '220', zone4Temp: '210',
    moldTempFixed: '40', moldTempMoving: '40', injPressure1: '100', holdPressure: '65',
    injSpeed1: '80', injSpeed2: '55', holdTime: '10', coolTime: '20', injTime: '3',
    metering: '110', cushion: '8', backPressure: '4', screwRpm: '90', clampForce: '200',
    moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '콜드', weight: '80', wallThicknessMin: '2.0', wallThicknessMax: '3.5',
  },
  {
    label: 'ABS — 변색',
    defectType: '변색 (Discoloration)',
    defectDescription: '제품 끝부분 및 웰드라인 부근 황변. 특히 사이클 정지 후 재가동 첫 5샷에 심함.',
    resinType: 'ABS', filler: '없음', fillerContent: '', flameRetardant: 'UL94 V-0', flameRetardantThickness: '1.6', flameRetardantType: '할로겐', resinDetail: 'ABS V-0', resinGrade: 'LG Chem Starex HG0660',
    nozzleTemp: '255', zone1Temp: '250', zone2Temp: '245', zone3Temp: '238', zone4Temp: '230',
    moldTempFixed: '65', moldTempMoving: '60', injPressure1: '110', holdPressure: '75',
    injSpeed1: '65', injSpeed2: '45', holdTime: '9', coolTime: '18', injTime: '3',
    metering: '75', cushion: '5', backPressure: '7', screwRpm: '75', clampForce: '150',
    moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '콜드', weight: '55', wallThicknessMin: '1.8', wallThicknessMax: '3.0',
  },
  {
    label: 'PPS GF40% — 플래시',
    defectType: '플래시 (Flash)',
    defectDescription: '파팅라인 전체 구간에 얇은 버(flash) 발생. 형체력 올려도 개선 안됨.',
    resinType: 'PPS', filler: 'GF(유리섬유)', fillerContent: '40', flameRetardant: '없음', flameRetardantThickness: '미입력', flameRetardantType: '해당없음', resinDetail: 'PPS GF40%', resinGrade: 'Toray A504X90',
    nozzleTemp: '320', zone1Temp: '315', zone2Temp: '310', zone3Temp: '305', zone4Temp: '295',
    moldTempFixed: '140', moldTempMoving: '135', injPressure1: '160', holdPressure: '110',
    injSpeed1: '75', injSpeed2: '50', holdTime: '10', coolTime: '20', injTime: '4',
    metering: '65', cushion: '5', backPressure: '5', screwRpm: '55', clampForce: '250',
    moldType: '2판', gateType: '필름', cavities: '2', runnerType: '콜드', weight: '90', wallThicknessMin: '1.0', wallThicknessMax: '2.5',
  },
  {
    label: 'PBT GF30% — 웰드라인',
    defectType: '웰드라인 (Weld Line)',
    defectDescription: '2개 게이트 합류 지점에 뚜렷한 웰드라인. 외관 불량 및 강도 저하 의심.',
    resinType: 'PBT', filler: 'GF(유리섬유)', fillerContent: '30', flameRetardant: 'UL94 V-0', flameRetardantThickness: '0.8', flameRetardantType: '할로겐프리', resinDetail: 'PBT GF30% V-0', resinGrade: 'BASF Ultradur B4300 G6',
    nozzleTemp: '260', zone1Temp: '255', zone2Temp: '248', zone3Temp: '240', zone4Temp: '235',
    moldTempFixed: '80', moldTempMoving: '75', injPressure1: '140', holdPressure: '95',
    injSpeed1: '70', injSpeed2: '50', holdTime: '10', coolTime: '18', injTime: '3',
    metering: '80', cushion: '6', backPressure: '6', screwRpm: '65', clampForce: '160',
    moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '핫', weight: '60', wallThicknessMin: '1.5', wallThicknessMax: '3.0',
  },
  {
    label: 'PC/ABS — 미성형',
    defectType: '미성형 (Short Shot)',
    defectDescription: '제품 끝단부 2군데에서 미충전. 사출 압력 올리면 플래시 발생.',
    resinType: 'PC/ABS', filler: '없음', fillerContent: '', flameRetardant: 'UL94 V-0', flameRetardantThickness: '1.5', flameRetardantType: '할로겐프리', resinDetail: 'PC/ABS V-0 HF', resinGrade: 'Bayer Bayblend T85',
    nozzleTemp: '265', zone1Temp: '260', zone2Temp: '252', zone3Temp: '245', zone4Temp: '240',
    moldTempFixed: '75', moldTempMoving: '70', injPressure1: '145', holdPressure: '95',
    injSpeed1: '85', injSpeed2: '60', holdTime: '10', coolTime: '20', injTime: '4',
    metering: '90', cushion: '5', backPressure: '8', screwRpm: '65', clampForce: '200',
    moldType: '2판', gateType: '핀포인트', cavities: '4', runnerType: '핫', weight: '70', wallThicknessMin: '1.2', wallThicknessMax: '2.8',
  },
];

// --- Main Diagnose Content ---
function DiagnoseContent() {
  const searchParams = useSearchParams();
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
  const [outputLang, setOutputLang] = useState<'ko' | 'en'>('ko');
  const [isLoading, setIsLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advSettings, setAdvSettings] = useState({
    vpTransferPos: '', vpTransferPressure: '',
    preInjectDecompDist: '', preInjectDecompSpeed: '', postMeterDecompDist: '',
    actualFillTime: '', actualPeakPressure: '', actualCushion: '', actualCycleTime: '', actualPartWeight: '',
    dryTemp: '', dryTime: '', dryerType: '없음', moistureContent: '',
    hrManifoldTemp: '', hrNozzle1Temp: '', hrNozzle2Temp: '', hrNozzle3Temp: '', hrNozzle4Temp: '', valveGate: '없음',
    regrindRatio: '', colorType: '없음', mbRatio: '',
    machineModel: '', screwDiameter: '', maxClampForce: '', maxInjPressure: '',
  });
  const [moldDrawings, setMoldDrawings] = useState<ImageFile[]>([]);
  const [isDraggingDrawing, setIsDraggingDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingSettings, setIsExtractingSettings] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsImageRef = useRef<HTMLInputElement>(null);
  const moldDrawingInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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
      if (!res.ok) throw new Error('추출 실패');
      const extracted = await res.json();
      setSettings(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(extracted)) {
          if (key in updated && extracted[key]) {
            (updated as Record<string, string>)[key] = extracted[key];
          }
        }
        return updated;
      });
      const filled = Object.values(extracted).filter(Boolean).length;
      setExtractMsg(`✓ ${filled}개 항목을 자동으로 입력했습니다.`);
    } catch {
      setExtractMsg('추출 실패. 사출기 화면이 잘 보이는 사진을 사용해주세요.');
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

  const processFile = useCallback(async (file: File): Promise<ImageFile | null> => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve({
          id: Math.random().toString(36).slice(2),
          file,
          preview: file.type === 'application/pdf' ? '' : dataUrl,
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiagnose = async () => {
    const effectiveResin = resinType === '기타 (직접 입력)' ? customResin : resinType;
    if (!effectiveResin) {
      setError('수지 종류를 선택해주세요. (필수 항목)');
      return;
    }
    setIsLoading(true);
    setStreamText('');
    setError('');
    setResult(null);

    try {
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
        images: images.map(img => ({ data: img.base64, mediaType: img.mediaType })),
        moldDrawings: moldDrawings.map(img => ({ data: img.base64, mediaType: img.mediaType })),
        outputLang,
      };

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = '진단 실패';
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch { /* HTML 에러 페이지 등 무시 */ }
        throw new Error(errMsg);
      }

      // Stream reading
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setStreamText(accumulated);
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Parse final JSON
      let jsonText = accumulated.trim()
        .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
        .replace(/^```\s*/i, '').replace(/\s*```$/, '');
      let data: DiagnosisResult;
      try {
        data = JSON.parse(jsonText);
      } catch {
        throw new Error(`AI 응답 파싱 실패. 다시 시도해주세요.\n(응답 길이: ${jsonText.length}자)`);
      }
      setResult(data);
      setStreamText('');

      // Save to localStorage
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('diagnoseHistory') : null;
        const history = JSON.parse(raw || '[]');
        history.unshift({ ...data, timestamp: new Date().toISOString(), id: Date.now() });
        localStorage.setItem('diagnoseHistory', JSON.stringify(history.slice(0, 20)));
      } catch { /* localStorage 비활성화 또는 용량 초과 시 무시 */ }

      // Scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '진단 중 오류가 발생했습니다.');
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
      alert('PDF 저장 중 오류가 발생했습니다.');
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">사출 불량 AI 진단</h1>
          <p className="text-slate-500">{outputLang === 'ko' ? '불량 정보와 성형 조건을 입력하면 AI가 원인과 해결책을 알려드립니다.' : 'Enter defect info and molding conditions — AI will diagnose causes and solutions.'}</p>
        </div>
        {/* Language toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0 mt-1">
          <button
            type="button"
            onClick={() => setOutputLang('ko')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${outputLang === 'ko' ? 'bg-white text-[#059669] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🇰🇷 한국어
          </button>
          <button
            type="button"
            onClick={() => setOutputLang('en')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${outputLang === 'en' ? 'bg-white text-[#059669] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            🇺🇸 English
          </button>
        </div>
      </div>

      {/* Sample cases */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-amber-700 font-semibold text-sm">샘플 케이스로 빠른 테스트</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_CASES.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadSample(i)}
              className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* STEP 1: Defect Info */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-[#1E293B] mb-5 flex items-center gap-2">
            <span className="bg-[#059669] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">1</span>
            불량 정보 입력
          </h2>

          {/* Image upload */}
          <div className="mb-5">
            <label className={labelCls}>불량 사진 업로드 (최대 5장)</label>
            <div
              className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-[#059669] bg-green-50' : 'border-slate-300 hover:border-[#059669]'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-10 h-10 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-600 font-medium">클릭하거나 드래그하여 업로드</p>
              <p className="text-slate-400 text-sm mt-1">또는 Ctrl+V로 붙여넣기 · 카메라로 직접 촬영</p>
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
                    <img src={img.preview} alt="불량 사진" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      aria-label="사진 삭제"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Defect type */}
          <div className="mb-4">
            <label className={labelCls}>불량 유형 선택 (선택 사항 — AI가 사진으로 판단)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {DEFECT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDefectType(defectType === type ? '' : type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all border ${
                    defectType === type
                      ? 'bg-[#059669] text-white border-[#059669]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-[#059669]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {defectType === '기타 (직접 입력)' && (
              <input
                type="text"
                className={`${inputCls} mt-2`}
                placeholder="불량 유형 직접 입력"
                value={customDefect}
                onChange={(e) => setCustomDefect(e.target.value)}
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>불량 상황 설명 (선택)</label>
            <textarea
              className={`${inputCls} h-24 resize-none`}
              placeholder="예: 5샷에 1번꼴로 발생, 특정 부위에서만, 오후에 심해짐..."
              value={defectDescription}
              onChange={(e) => setDefectDescription(e.target.value)}
            />
          </div>
        </section>

        {/* STEP 2: Resin Info */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-[#1E293B] mb-5 flex items-center gap-2">
            <span className="bg-[#059669] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            수지 정보
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>수지 종류 <span className="text-red-500">*</span></label>
              <select
                className={inputCls}
                value={resinType}
                onChange={(e) => setResinType(e.target.value)}
              >
                <option value="">선택하세요</option>
                {RESIN_OPTIONS.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {resinType === '기타 (직접 입력)' && (
                <input type="text" className={`${inputCls} mt-2`} placeholder="수지 종류 직접 입력" value={customResin} onChange={(e) => setCustomResin(e.target.value)} />
              )}
            </div>
            <div>
              <label className={labelCls}>강화재/필러</label>
              <select className={inputCls} value={filler} onChange={(e) => setFiller(e.target.value)}>
                {['없음', 'GF(유리섬유)', 'CF(탄소섬유)', 'GF+CF', '미네랄', '탈크', 'GB(유리비드)', '기타'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>강화재 함량 (%)</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder="예: 33" value={fillerContent} onChange={(e) => setFillerContent(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>난연 등급</label>
              <select className={inputCls} value={flameRetardant} onChange={(e) => setFlameRetardant(e.target.value)}>
                {['없음', 'UL94 V-0', 'UL94 V-1', 'UL94 V-2', 'UL94 HB', 'UL94 5VA', 'UL94 5VB'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>난연 인증 두께 (mm)</label>
              <select className={inputCls} value={flameRetardantThickness} onChange={(e) => setFlameRetardantThickness(e.target.value)}>
                {['미입력', '0.4', '0.75', '0.8', '1.0', '1.5', '1.6', '2.0', '3.0', '3.2'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>난연 타입</label>
              <select className={inputCls} value={flameRetardantType} onChange={(e) => setFlameRetardantType(e.target.value)}>
                {['해당없음', '할로겐', '할로겐프리', '적인계', '멜라민계'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>수지 상세</label>
              <input type="text" className={inputCls} placeholder="예: PA66 GF33% 할로겐프리 난연" value={resinDetail} onChange={(e) => setResinDetail(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>수지 제조사/Grade</label>
              <input type="text" className={inputCls} placeholder="예: DSM Stanyl TW341" value={resinGrade} onChange={(e) => setResinGrade(e.target.value)} />
            </div>
          </div>
        </section>

        {/* STEP 2b: Machine Settings */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
              <span className="bg-[#059669] text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              사출기 셋팅값
            </h2>
            <button
              type="button"
              onClick={() => settingsImageRef.current?.click()}
              disabled={isExtractingSettings}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-100 text-blue-700 disabled:text-slate-400 border border-blue-300 disabled:border-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              {isExtractingSettings ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  읽는 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  사진으로 자동 입력
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
          </div>
          {extractMsg && (
            <div className={`mb-4 text-sm px-3 py-2 rounded-lg ${extractMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {extractMsg}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label className={labelCls}>사출 온도 (℃)</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { key: 'nozzleTemp', label: '노즐' },
                  { key: 'zone1Temp', label: 'Zone1' },
                  { key: 'zone2Temp', label: 'Zone2' },
                  { key: 'zone3Temp', label: 'Zone3' },
                  { key: 'zone4Temp', label: 'Zone4' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="text-xs text-slate-500 mb-1 text-center">{label}</div>
                    <input type="text" inputMode="numeric" className={inputCls} placeholder="℃" value={settings[key as keyof typeof settings]} onChange={(e) => setSetting(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>금형 온도 (℃)</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ key: 'moldTempFixed', label: '고정측' }, { key: 'moldTempMoving', label: '가동측' }].map(({ key, label }) => (
                  <div key={key}>
                    <div className="text-xs text-slate-500 mb-1">{label}</div>
                    <input type="text" inputMode="numeric" className={inputCls} placeholder="℃" value={settings[key as keyof typeof settings]} onChange={(e) => setSetting(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'injPressure1', label: '사출압력 1차', placeholder: 'MPa' },
                { key: 'holdPressure', label: '보압', placeholder: 'MPa' },
                { key: 'injSpeed1', label: '사출속도 1차', placeholder: '%' },
                { key: 'injSpeed2', label: '사출속도 2차', placeholder: '%' },
                { key: 'holdTime', label: '보압 시간', placeholder: 'sec' },
                { key: 'coolTime', label: '냉각 시간', placeholder: 'sec' },
                { key: 'injTime', label: '사출 시간', placeholder: 'sec' },
                { key: 'metering', label: '계량', placeholder: 'mm' },
                { key: 'cushion', label: '쿠션', placeholder: 'mm' },
                { key: 'backPressure', label: '배압', placeholder: 'MPa' },
                { key: 'screwRpm', label: '스크류 회전수', placeholder: 'rpm' },
                { key: 'clampForce', label: '형체력', placeholder: 'ton' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <input type="text" inputMode="numeric" className={inputCls} placeholder={placeholder} value={settings[key as keyof typeof settings]} onChange={(e) => setSetting(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              고급 설정 {showAdvanced ? '접기' : '펼치기'} (V/P전환·감압·실측값·건조·핫러너·재생재·사출기 정보)
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5 border-t border-slate-100 pt-5">

                {/* V/P 전환 & 감압 */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">V/P 전환 & 감압(석백)</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'vpTransferPos', label: 'V/P 전환 위치', placeholder: 'mm' },
                      { key: 'vpTransferPressure', label: 'V/P 전환 압력', placeholder: 'MPa' },
                      { key: 'preInjectDecompDist', label: '사출 전 감압 거리', placeholder: 'mm' },
                      { key: 'preInjectDecompSpeed', label: '사출 전 감압 속도', placeholder: 'mm/s' },
                      { key: 'postMeterDecompDist', label: '계량 후 감압 거리', placeholder: 'mm' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <input type="text" inputMode="numeric" className={inputCls} placeholder={placeholder} value={advSettings[key as keyof typeof advSettings]} onChange={(e) => setAdvSetting(key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 실측값 */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">실제 측정값 (모니터에서 읽은 값)</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'actualFillTime', label: '실제 충전 시간', placeholder: 'sec' },
                      { key: 'actualPeakPressure', label: '최대 사출압력(피크)', placeholder: 'MPa' },
                      { key: 'actualCushion', label: '실제 쿠션량', placeholder: 'mm' },
                      { key: 'actualCycleTime', label: '실제 사이클 타임', placeholder: 'sec' },
                      { key: 'actualPartWeight', label: '제품 실측 중량', placeholder: 'g' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <input type="text" inputMode="numeric" className={inputCls} placeholder={placeholder} value={advSettings[key as keyof typeof advSettings]} onChange={(e) => setAdvSetting(key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 건조 */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">건조 조건</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">건조 온도</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="℃" value={advSettings.dryTemp} onChange={(e) => setAdvSetting('dryTemp', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">건조 시간</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="hr" value={advSettings.dryTime} onChange={(e) => setAdvSetting('dryTime', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">건조기 타입</div>
                      <select className={inputCls} value={advSettings.dryerType} onChange={(e) => setAdvSetting('dryerType', e.target.value)}>
                        {['없음', '제습식', '열풍식'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">수분율 측정값</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="%" value={advSettings.moistureContent} onChange={(e) => setAdvSetting('moistureContent', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* 핫러너 (핫러너 금형일 때) */}
                {(moldType === '핫러너' || runnerType === '핫') && (
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">핫러너 설정</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'hrManifoldTemp', label: '매니폴드' },
                        { key: 'hrNozzle1Temp', label: '노즐 1' },
                        { key: 'hrNozzle2Temp', label: '노즐 2' },
                        { key: 'hrNozzle3Temp', label: '노즐 3' },
                        { key: 'hrNozzle4Temp', label: '노즐 4' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <div className="text-xs text-slate-500 mb-1">{label} (℃)</div>
                          <input type="text" inputMode="numeric" className={inputCls} placeholder="℃" value={advSettings[key as keyof typeof advSettings]} onChange={(e) => setAdvSetting(key, e.target.value)} />
                        </div>
                      ))}
                      <div>
                        <div className="text-xs text-slate-500 mb-1">밸브게이트</div>
                        <select className={inputCls} value={advSettings.valveGate} onChange={(e) => setAdvSetting('valveGate', e.target.value)}>
                          {['없음', '있음'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 재생재/컬러 */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">재생재 & 컬러</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">재생재 혼합 비율</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="%" value={advSettings.regrindRatio} onChange={(e) => setAdvSetting('regrindRatio', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">컬러 타입</div>
                      <select className={inputCls} value={advSettings.colorType} onChange={(e) => setAdvSetting('colorType', e.target.value)}>
                        {['없음', '마스터배치', '액상컬러', '분체컬러'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    {advSettings.colorType !== '없음' && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">컬러 투입 비율</div>
                        <input type="text" inputMode="numeric" className={inputCls} placeholder="%" value={advSettings.mbRatio} onChange={(e) => setAdvSetting('mbRatio', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* 사출기 정보 */}
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">사출기 정보 (선택)</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-500 mb-1">사출기 제조사/모델</div>
                      <input type="text" className={inputCls} placeholder="예: Fanuc 100T, Engel 150" value={advSettings.machineModel} onChange={(e) => setAdvSetting('machineModel', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">스크류 직경</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="mm" value={advSettings.screwDiameter} onChange={(e) => setAdvSetting('screwDiameter', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">최대 형체력</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="ton" value={advSettings.maxClampForce} onChange={(e) => setAdvSetting('maxClampForce', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">최대 사출압력</div>
                      <input type="text" inputMode="numeric" className={inputCls} placeholder="MPa" value={advSettings.maxInjPressure} onChange={(e) => setAdvSetting('maxInjPressure', e.target.value)} />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </section>

        {/* STEP 2c: Mold & Product Info */}
        <section className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-[#1E293B] mb-5 flex items-center gap-2">
            <span className="bg-slate-400 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            금형 & 제품 정보 <span className="text-slate-400 text-sm font-normal">(선택)</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>금형 타입</label>
              <select className={inputCls} value={moldType} onChange={(e) => setMoldType(e.target.value)}>
                <option value="">선택</option>
                {['2판', '3판', '핫러너'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>게이트 타입</label>
              <select className={inputCls} value={gateType} onChange={(e) => setGateType(e.target.value)}>
                <option value="">선택</option>
                {['사이드', '핀포인트', '서브마린', '다이렉트', '밸브'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>캐비티 수</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder="예: 4" value={cavities} onChange={(e) => setCavities(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>러너 타입</label>
              <select className={inputCls} value={runnerType} onChange={(e) => setRunnerType(e.target.value)}>
                <option value="">선택</option>
                {['콜드', '핫'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>제품 중량 (g)</label>
              <input type="text" inputMode="numeric" className={inputCls} placeholder="예: 45" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>벽 두께 (mm)</label>
              <div className="flex gap-2 items-center">
                <input type="text" inputMode="numeric" className={inputCls} placeholder="최소" value={wallThicknessMin} onChange={(e) => setWallThicknessMin(e.target.value)} />
                <span className="text-slate-400">~</span>
                <input type="text" inputMode="numeric" className={inputCls} placeholder="최대" value={wallThicknessMax} onChange={(e) => setWallThicknessMax(e.target.value)} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>제품 특이사항</label>
              <input type="text" className={inputCls} placeholder="예: 인서트, 이중사출, 보스, 리브 등" value={productNotes} onChange={(e) => setProductNotes(e.target.value)} />
            </div>

            {/* Mold Drawing Upload */}
            <div className="sm:col-span-2 mt-2">
              <label className={labelCls}>금형 도면 업로드 <span className="text-slate-400 font-normal">(선택 · 최대 3장)</span></label>
              <div
                className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-colors ${
                  isDraggingDrawing ? 'border-[#059669] bg-green-50' : 'border-slate-300 hover:border-[#059669]'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingDrawing(true); }}
                onDragLeave={() => setIsDraggingDrawing(false)}
                onDrop={(e) => { e.preventDefault(); setIsDraggingDrawing(false); addMoldDrawings(e.dataTransfer.files); }}
                onClick={() => moldDrawingInputRef.current?.click()}
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-600 text-sm font-medium">금형 도면, 제품 3D 캡처, 게이트/러너 레이아웃 이미지를 올려주세요</p>
                <p className="text-slate-400 text-xs mt-1">AI가 금형 구조를 분석하여 불량 원인 진단에 반영합니다 · JPG, PNG, PDF</p>
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
                    <div key={d.id} className="relative flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1.5 border border-slate-200">
                      {d.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.preview} alt="도면" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center text-xs font-bold text-red-600">PDF</div>
                      )}
                      <span className="text-xs text-slate-600 max-w-[80px] truncate">{d.file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMoldDrawings(prev => prev.filter(x => x.id !== d.id)); }}
                        className="ml-1 text-slate-400 hover:text-red-500"
                        aria-label="도면 삭제"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Diagnose Button */}
        <button
          type="button"
          onClick={handleDiagnose}
          disabled={isLoading}
          className="w-full bg-[#059669] hover:bg-[#047857] disabled:bg-slate-300 text-white py-4 rounded-xl font-bold text-xl transition-colors shadow-lg flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI 진단 중...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 진단 시작
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Streaming progress */}
        {isLoading && streamText && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <svg className="animate-spin w-4 h-4 text-[#059669]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-sm font-medium text-[#059669]">AI 분석 중...</span>
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-50 rounded-lg p-3 max-h-32 overflow-hidden relative">
              <div className="line-clamp-6">{streamText.slice(-500)}</div>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent" />
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div ref={resultRef}>
            <DiagnosisResultPanel
              result={result}
              outputLang={outputLang}
              onSavePDF={handleSavePDF}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiagnosePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669]"></div></div>}>
      <DiagnoseContent />
    </Suspense>
  );
}
