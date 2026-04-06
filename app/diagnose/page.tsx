'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

const SAMPLE_DATA = {
  defectType: '은줄 (Silver Streak)',
  defectDescription: '제품 표면에 은색 줄무늬가 발생. 5샷에 1번꼴로 발생하며 게이트 부근에서 시작됨.',
  resinType: 'PA66',
  filler: 'GF(유리섬유)',
  fillerContent: '33',
  resinDetail: 'PA66 GF33% 할로겐프리 난연',
  nozzleTemp: '285', zone1Temp: '280', zone2Temp: '275', zone3Temp: '265', zone4Temp: '255',
  moldTempFixed: '80', moldTempMoving: '80',
  injPressure1: '120', holdPressure: '80',
  injSpeed1: '60', injSpeed2: '40',
  holdTime: '8', coolTime: '15', injTime: '3',
  metering: '85', cushion: '5', backPressure: '5', screwRpm: '80',
  moldType: '2판', gateType: '사이드', cavities: '4', runnerType: '콜드',
  weight: '45', wallThicknessMin: '1.5', wallThicknessMax: '3.0',
};

// --- Severity Badge ---
function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    high: { label: '심각 (상)', cls: 'bg-red-100 text-red-700 border border-red-300' },
    medium: { label: '주의 (중)', cls: 'bg-amber-100 text-amber-700 border border-amber-300' },
    low: { label: '경미 (하)', cls: 'bg-green-100 text-green-700 border border-green-300' },
  };
  const c = config[severity as keyof typeof config] || config.medium;
  return <span className={`px-3 py-1 rounded-full text-sm font-bold ${c.cls}`}>{c.label}</span>;
}

// --- Direction Arrow ---
function DirectionArrow({ direction }: { direction?: string }) {
  if (direction === 'up') return <span className="text-red-500 font-bold">↑</span>;
  if (direction === 'down') return <span className="text-blue-500 font-bold">↓</span>;
  return <span className="text-green-500 font-bold">✓</span>;
}

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
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
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

  const loadSample = () => {
    setDefectType(SAMPLE_DATA.defectType);
    setDefectDescription(SAMPLE_DATA.defectDescription);
    setResinType(SAMPLE_DATA.resinType);
    setFiller(SAMPLE_DATA.filler);
    setFillerContent(SAMPLE_DATA.fillerContent);
    setResinDetail(SAMPLE_DATA.resinDetail);
    setSettings({
      nozzleTemp: SAMPLE_DATA.nozzleTemp, zone1Temp: SAMPLE_DATA.zone1Temp,
      zone2Temp: SAMPLE_DATA.zone2Temp, zone3Temp: SAMPLE_DATA.zone3Temp,
      zone4Temp: SAMPLE_DATA.zone4Temp,
      moldTempFixed: SAMPLE_DATA.moldTempFixed, moldTempMoving: SAMPLE_DATA.moldTempMoving,
      injPressure1: SAMPLE_DATA.injPressure1, holdPressure: SAMPLE_DATA.holdPressure,
      injSpeed1: SAMPLE_DATA.injSpeed1, injSpeed2: SAMPLE_DATA.injSpeed2,
      holdTime: SAMPLE_DATA.holdTime, coolTime: SAMPLE_DATA.coolTime,
      injTime: SAMPLE_DATA.injTime, metering: SAMPLE_DATA.metering,
      cushion: SAMPLE_DATA.cushion, backPressure: SAMPLE_DATA.backPressure,
      screwRpm: SAMPLE_DATA.screwRpm, clampForce: '',
    });
    setMoldType(SAMPLE_DATA.moldType);
    setGateType(SAMPLE_DATA.gateType);
    setCavities(SAMPLE_DATA.cavities);
    setRunnerType(SAMPLE_DATA.runnerType);
    setWeight(SAMPLE_DATA.weight);
    setWallThicknessMin(SAMPLE_DATA.wallThicknessMin);
    setWallThicknessMax(SAMPLE_DATA.wallThicknessMax);
  };

  const handleDiagnose = async () => {
    setIsLoading(true);
    setStreamText('');
    setError('');
    setResult(null);
    setCheckedItems(new Set());

    try {
      const payload = {
        defectType: defectType === '기타 (직접 입력)' ? customDefect : defectType,
        defectDescription,
        resinInfo: {
          resinType: resinType === '기타 (직접 입력)' ? customResin : resinType,
          filler, fillerContent, flameRetardant, flameRetardantType, resinDetail, resinGrade,
        },
        settings,
        advSettings,
        moldInfo: { moldType, gateType, cavities, runnerType },
        productInfo: { weight, wallThicknessMin, wallThicknessMax, notes: productNotes },
        images: images.map(img => ({ data: img.base64, mediaType: img.mediaType })),
        moldDrawings: moldDrawings.map(img => ({ data: img.base64, mediaType: img.mediaType })),
      };

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '진단 실패');
      }

      // Stream reading
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setStreamText(accumulated);
        }
      }

      // Parse final JSON
      let jsonText = accumulated.trim()
        .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
        .replace(/^```\s*/i, '').replace(/\s*```$/, '');
      const data = JSON.parse(jsonText);
      setResult(data);
      setStreamText('');

      // Save to localStorage
      const history = JSON.parse(localStorage.getItem('diagnoseHistory') || '[]');
      history.unshift({ ...data, timestamp: new Date().toISOString(), id: Date.now() });
      localStorage.setItem('diagnoseHistory', JSON.stringify(history.slice(0, 20)));

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1E293B] mb-2">사출 불량 AI 진단</h1>
        <p className="text-slate-500">불량 정보와 성형 조건을 입력하면 AI가 원인과 해결책을 알려드립니다.</p>
      </div>

      {/* Sample button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={loadSample}
          className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          샘플로 테스트
        </button>
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
                      onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
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
              <label className={labelCls}>수지 종류</label>
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
                        onClick={(e) => { e.stopPropagation(); setMoldDrawings(prev => prev.filter(x => x.id !== d.id)); }}
                        className="ml-1 text-slate-400 hover:text-red-500"
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
          <div ref={resultRef} className="space-y-5">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
                    {result.defect_type.ko}
                    <span className="text-slate-400 text-sm sm:text-base font-normal ml-2">({result.defect_type.en})</span>
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <SeverityBadge severity={result.severity} />
                  </div>
                </div>
                <button
                  onClick={handleSavePDF}
                  className="flex items-center gap-2 bg-[#1E293B] hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF 저장
                </button>
              </div>
              <p className="text-slate-600 text-base leading-relaxed bg-slate-50 rounded-lg p-4">{result.summary}</p>

              {/* Defect phase + process window */}
              {result.defect_phase && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                    {result.defect_phase === 'filling' ? '충전(Filling) 불량' :
                     result.defect_phase === 'packing' ? '보압(Packing) 불량' :
                     result.defect_phase === 'cooling' ? '냉각(Cooling) 불량' : '재료(Material) 불량'}
                  </span>
                </div>
              )}
              {result.process_window_check && (
                <div className="mt-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">프로세스 윈도우 체크</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(result.process_window_check).map(([key, val]) => {
                      if (!val) return null;
                      const labelMap: Record<string, string> = { melt_temp: '용융 온도', mold_temp: '금형 온도', injection_speed: '사출 속도', pack_pressure: '보압', drying: '건조' };
                      const colorMap = { ok: 'bg-green-50 border-green-200 text-green-700', warning: 'bg-amber-50 border-amber-200 text-amber-700', critical: 'bg-red-50 border-red-200 text-red-700' };
                      const iconMap = { ok: '✓', warning: '⚠', critical: '✕' };
                      const c = colorMap[val.status] || colorMap.warning;
                      return (
                        <div key={key} className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${c}`}>
                          <span className="font-bold shrink-0">{iconMap[val.status]} {labelMap[key] || key}</span>
                          <span>{val.note}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Top 5 Actions */}
            {result.top5_actions && result.top5_actions.length > 0 && (
              <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-2xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="bg-[#059669] text-white text-xs px-2 py-1 rounded-full font-bold">즉시 실행</span>
                  최우선 조치 5가지
                </h3>
                <div className="space-y-3">
                  {result.top5_actions.map((item) => {
                    const colors = [
                      { ring: 'bg-red-500', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
                      { ring: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
                      { ring: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                      { ring: 'bg-blue-500', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                      { ring: 'bg-slate-500', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
                    ];
                    const c = colors[(item.step - 1) % colors.length];
                    return (
                      <div key={item.step} className={`flex gap-3 p-3 rounded-xl border ${c.badge}`}>
                        <div className={`shrink-0 w-7 h-7 rounded-full ${c.ring} flex items-center justify-center text-white text-sm font-bold`}>
                          {item.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm leading-snug">{item.action}</p>
                          <p className="text-slate-400 text-xs mt-1">{item.why}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Causes */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-[#1E293B] mb-4">원인 분석</h3>
              <div className="space-y-4">
                {result.causes.map((cause) => (
                  <div key={cause.rank} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          cause.rank === 1 ? 'bg-red-500' : cause.rank === 2 ? 'bg-amber-500' : 'bg-slate-400'
                        }`}>{cause.rank}</span>
                        <span className="font-semibold text-slate-700 text-sm sm:text-base">{cause.description}</span>
                      </div>
                      <span className={`shrink-0 text-sm font-bold px-2 py-1 rounded ${
                        cause.rank === 1 ? 'bg-red-50 text-red-600' : cause.rank === 2 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                      }`}>{cause.probability}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${cause.rank === 1 ? 'bg-red-500' : cause.rank === 2 ? 'bg-amber-500' : 'bg-slate-400'}`}
                        style={{ width: `${cause.probability}%` }}
                      />
                    </div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${
                      cause.category?.includes('Material') || cause.category === '건조' || cause.category === '수지' ? 'bg-blue-100 text-blue-700' :
                      cause.category?.includes('Machine') || cause.category === '온도' || cause.category === '압력' ? 'bg-red-100 text-red-700' :
                      cause.category?.includes('Mold') || cause.category === '금형' ? 'bg-purple-100 text-purple-700' :
                      cause.category?.includes('Method') ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>{cause.category}</span>
                    <p className="text-slate-600 text-sm mb-1">{cause.detail || cause.scientific_reasoning}</p>
                    {cause.evidence && <p className="text-xs text-slate-400 bg-slate-50 rounded px-2 py-1">근거: {cause.evidence}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-[#1E293B] mb-4">해결 방안 — 셋팅 비교</h3>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left px-4 py-3 font-semibold rounded-l-lg">파라미터</th>
                      <th className="text-center px-4 py-3 font-semibold">현재값</th>
                      <th className="text-center px-4 py-3 font-semibold">권장값</th>
                      <th className="text-left px-4 py-3 font-semibold rounded-r-lg">변경 이유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.recommendations.map((rec, i) => {
                      const changed = rec.current !== rec.recommended && rec.direction !== 'same';
                      return (
                        <tr key={i} className={changed ? 'bg-amber-50' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-700">{rec.parameter}</td>
                          <td className="px-4 py-3 text-center text-slate-500">{rec.current || '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-[#1E293B]">
                            <span className="flex items-center justify-center gap-1">
                              <DirectionArrow direction={rec.direction} />
                              {rec.recommended}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{rec.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {result.recommendations.map((rec, i) => {
                  const changed = rec.current !== rec.recommended && rec.direction !== 'same';
                  return (
                    <div key={i} className={`rounded-xl p-3 border ${changed ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-700 text-sm">{rec.parameter}</span>
                        {changed && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">변경 필요</span>}
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 text-center bg-white rounded-lg p-2 border border-slate-200">
                          <div className="text-xs text-slate-400 mb-0.5">현재값</div>
                          <div className="text-sm text-slate-600 font-medium">{rec.current || '-'}</div>
                        </div>
                        <div className="text-slate-400">→</div>
                        <div className="flex-1 text-center bg-white rounded-lg p-2 border border-[#059669]/30">
                          <div className="text-xs text-slate-400 mb-0.5">권장값</div>
                          <div className="text-sm font-bold text-[#1E293B] flex items-center justify-center gap-1">
                            <DirectionArrow direction={rec.direction} />
                            {rec.recommended}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{rec.reason}</p>
                      {rec.expected_result && <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">기대 효과: {rec.expected_result}</p>}
                      {rec.risk && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">주의: {rec.risk}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table — expected_result column */}
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-[#1E293B] mb-4">현장 체크리스트</h3>
              {Array.isArray(result.checklist) ? (
                <div className="space-y-2">
                  {(result.checklist as string[]).map((item, i) => (
                    <label key={i} className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg transition-colors ${checkedItems.has(i) ? 'bg-green-50 line-through text-slate-400' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" className="mt-0.5 w-5 h-5 rounded accent-[#059669]" checked={checkedItems.has(i)} onChange={() => { setCheckedItems(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; }); }} />
                      <span className="text-sm text-slate-700">{item}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { key: 'before_changes', label: '변경 전 확인', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                    { key: 'after_changes', label: '변경 후 모니터링', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
                    { key: 'escalation', label: '에스컬레이션 기준', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
                  ].map(({ key, label, color, bg, border }) => {
                    const items = (result.checklist as Record<string, string[]>)[key] || [];
                    if (!items.length) return null;
                    return (
                      <div key={key} className={`rounded-xl p-3 border ${bg} ${border}`}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</div>
                        <div className="space-y-1">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className={`shrink-0 font-bold ${color}`}>·</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mold Analysis */}
            {result.mold_analysis && (
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-purple-200">
                <h3 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  금형 도면 분석
                </h3>
                <div className="space-y-3">
                  {result.mold_analysis.gate_assessment && (
                    <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                      <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">게이트 평가</div>
                      <p className="text-sm text-slate-700">{result.mold_analysis.gate_assessment}</p>
                    </div>
                  )}
                  {result.mold_analysis.cooling_assessment && (
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">냉각 효율 평가</div>
                      <p className="text-sm text-slate-700">{result.mold_analysis.cooling_assessment}</p>
                    </div>
                  )}
                  {result.mold_analysis.design_risk_factors?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">설계 위험 요소</div>
                      <div className="space-y-1">
                        {result.mold_analysis.design_risk_factors.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="shrink-0 text-amber-500 font-bold">!</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.mold_analysis.recommendations?.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">금형 수정 제안</div>
                      <div className="space-y-1">
                        {result.mold_analysis.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="shrink-0 text-green-600 font-bold">→</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {(result.resin_specific_notes || result.drying_assessment || result.additional_advice) && (
              <div className="bg-[#1E293B] text-white rounded-2xl p-4 sm:p-6 space-y-4">
                {result.resin_specific_notes && (
                  <div>
                    <h3 className="font-bold text-[#34D399] mb-2">수지 특성 주의사항</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.resin_specific_notes}</p>
                  </div>
                )}
                {result.drying_assessment && (
                  <div>
                    <h3 className="font-bold text-blue-400 mb-2">건조 조건 평가</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.drying_assessment}</p>
                  </div>
                )}
                {result.additional_advice && (
                  <div>
                    <h3 className="font-bold text-amber-400 mb-2">추가 조언</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.additional_advice}</p>
                  </div>
                )}
              </div>
            )}
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
