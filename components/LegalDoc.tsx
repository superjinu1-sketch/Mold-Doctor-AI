import React from 'react';

// 간이 마크다운 렌더러(# ## ###, '- ' 목록, 빈 줄 문단). 외부 의존성 없음.
function renderBlocks(md: string) {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: number) => {
    if (list.length) {
      out.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 my-2 space-y-1 text-muted text-body leading-relaxed">
          {list.map((li, i) => <li key={i}>{li}</li>)}
        </ul>
      );
      list = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith('### ')) { flush(i); out.push(<h3 key={i} className="text-[length:var(--text-subhead)] font-bold text-ink mt-5 mb-1">{line.slice(4)}</h3>); }
    else if (line.startsWith('## ')) { flush(i); out.push(<h2 key={i} className="text-[length:var(--text-subhead)] font-bold text-ink mt-6 mb-2">{line.slice(3)}</h2>); }
    else if (line.startsWith('# ')) { flush(i); out.push(<h1 key={i} className="text-[length:var(--text-h2)] font-black text-ink mb-3">{line.slice(2)}</h1>); }
    else if (line.startsWith('- ')) { list.push(line.slice(2)); }
    else if (line === '') { flush(i); }
    else { flush(i); out.push(<p key={i} className="text-muted text-body leading-relaxed my-2">{line}</p>); }
  });
  flush(lines.length);
  return out;
}

export default function LegalDoc({ md, updated }: { md: string; updated?: string }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {updated && <p className="text-faint text-[length:var(--text-label)] mb-4">최종 업데이트: {updated}</p>}
      <article>{renderBlocks(md)}</article>
    </div>
  );
}
