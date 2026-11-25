// 모델 JSON의 괄호 짝 오류 복구. 2026-11-25 eval(cov-pps-coldslug)에서 process_window_check 뒤에 '}'가
// 하나 더 붙어 루트가 일찍 닫혔고, 파싱 실패 → 원인·조치가 빈 결과로 나갔다(내용은 멀쩡했다).
// 문자열 밖에서만 본다: 짝이 안 맞는 닫는 괄호, 뒤에 내용이 남았는데 루트를 닫는 괄호는 버리고,
// 끝까지 안 닫힌 괄호는 닫아 준다. 값 자체를 지어내지는 않는다.
export function repairJsonBrackets(text: string): string {
  const stack: string[] = [];
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    if (ch === '{' || ch === '[') { stack.push(ch === '{' ? '}' : ']'); out += ch; continue; }
    if (ch === '}' || ch === ']') {
      if (stack[stack.length - 1] !== ch) continue;            // 짝이 안 맞는 닫는 괄호
      if (stack.length === 1 && /[^\s]/.test(text.slice(i + 1))) continue; // 루트를 일찍 닫음
      stack.pop();
      out += ch;
      continue;
    }
    out += ch;
  }
  if (inString) out += '"';
  out = out.replace(/,\s*$/, '');
  while (stack.length) out += stack.pop();
  return out;
}
