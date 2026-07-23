// html2canvas + jsPDF 멀티페이지 PDF 파이프라인 — app/diagnose/page.tsx handleSavePDF /
// components/ResolutionReport.tsx generate()의 알고리즘을 그대로 추출(동작 변경 없음).
// 기존 두 호출부는 무접촉(회귀 리스크 0) — 신규 기능(condition-ledger)에서만 이 모듈을 사용.
//
// 섹션(section) = PDF에서 항상 새 페이지로 시작하는 단위(작업표준 저장소 PDF에서는 "설비 1대").
// 섹션 내부는 [data-pdf-block] 요소들을 순서대로 배치하며, 한 페이지에 다 안 들어가면 기존과
// 동일한 재귀 분할·최후 픽셀 슬라이싱 폴백을 사용한다.
export async function exportSectionsToPdf(sections: HTMLElement[][], filename: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas-pro');
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const M = 6;                      // 여백(mm)
  const GAP = 4;                    // 블록 간 간격(mm)
  const imgW = pageW - M * 2;
  const pageAvail = pageH - M * 2;  // 한 페이지 가용 높이

  for (let s = 0; s < sections.length; s++) {
    if (s > 0) pdf.addPage(); // 섹션(설비)당 새 페이지 시작
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

    for (const block of sections[s]) await placeBlock(block);
  }

  pdf.save(filename);
}
