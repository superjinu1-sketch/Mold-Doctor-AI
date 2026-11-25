// 단정 표현 후처리. 지시문으로 막아도 모델이 "확진·confirmed·validated"를 쓰는 경우가 남아(페르소나 재평가
// 2026-10-21: Sarah 결과에 confirmed 7회, validated window) 응답 문자열에서 직접 바꾼다. defect_type은 그대로 둔다.
// 2026-11-25: confirmed를 일괄 "highly likely"로 바꾸면 "until unit is highly likely", "cannot be highly likely",
// "with highly likely dry material"처럼 영어가 깨졌다(eval 캐시 40여 건). 조건·검증 문맥의 confirmed는 과장이
// 아니므로 "verified"로, 원인 단정만 "very likely"로 바꾼다.
const COND = /\b(if|once|until|unless|when|whenever|after|before|cannot|can't|could not|not|never|without|with|whether)\b/i;

function caseLike(src: string, rep: string): string {
  return /^[A-Z]/.test(src) ? rep[0].toUpperCase() + rep.slice(1) : rep;
}

function replaceConfirmed(text: string): string {
  return text.replace(/\bconfirmed(\s+as(\s+(the|a))?\s+)?/gi, (m: string, asPart: string | undefined, _t, _a, off: number, s: string) => {
    const start = Math.max(s.lastIndexOf('.', off), s.lastIndexOf(';', off), s.lastIndexOf('\n', off), s.lastIndexOf('!', off), s.lastIndexOf('?', off)) + 1;
    const pre = s.slice(start, off);
    const post = s.slice(off + m.length);
    const hasBe = /\b(is|are|was|were)\s+$/i.test(pre) || !pre.trim();
    if (asPart) return caseLike(m, `${hasBe ? '' : 'is '}very likely the `);
    if (/\b(the)\s+$/i.test(pre)) return 'most likely';
    if (/\b(a|an)\s+$/i.test(pre)) return 'likely';
    if (/\b(be|been|being)\s+$/i.test(pre) || COND.test(pre)) return caseLike(m, 'verified');
    if (/^\s+(OK|clean|dry|correct|normal|good|stable|present|absent)\b/i.test(post)) return caseLike(m, `${hasBe ? '' : 'is '}very likely`);
    return caseLike(m, 'highly likely');
  });
}

export function softenOverclaim(text: string): string {
  return replaceConfirmed(
    text
      .replace(/(거의\s*)?확(진|정)(적이다|된다|이다)/g, '가능성이 높다')
      .replace(/\b(is|are|was|were)\s+confirmed\s+by\b/gi, '$1 strongly supported by')
      .replace(/(거의\s*)?확진(적으로|적|됨)?/g, '가능성 높음')
      .replace(/확정(적으로|적|됨)/g, '가능성 높음')
      .replace(/(원인|분류|추정)\s*확정/g, '$1 가능성 높음'),
  )
    .replace(/\bconfirms\b/gi, 'strongly suggests')
    .replace(/\bdefinitively\b|\bdefinitely\b/gi, 'most likely')
    .replace(/\bvalidated\b/gi, 'supplier-recommended');
}

export function softenDeep(v: unknown): unknown {
  if (typeof v === 'string') return softenOverclaim(v);
  if (Array.isArray(v)) return v.map(softenDeep);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, k === 'defect_type' ? x : softenDeep(x)]));
  }
  return v;
}
