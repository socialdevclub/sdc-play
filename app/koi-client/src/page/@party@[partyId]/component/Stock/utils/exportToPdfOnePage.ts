import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportToPdfOptions {
  filename?: string;
  quality?: number;
  margin?: number;
  backgroundColor?: string;
}

export const exportToPdfOnePage = async (elementId: string, options: ExportToPdfOptions = {}): Promise<void> => {
  const { filename = 'portfolio-report.pdf', quality = 1, margin = 10, backgroundColor = '#ffffff' } = options;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // HTML 요소를 캔버스로 변환
    const canvas = await html2canvas(element, {
      allowTaint: true,
      backgroundColor,
      logging: false,
      scale: quality,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');

    // PDF 문서 생성 (A4 크기)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 여백을 고려한 실제 사용 가능한 크기
    const availableWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - margin * 2;

    // 캔버스 크기에 맞춰 PDF 이미지 크기 계산
    const canvasAspectRatio = canvas.height / canvas.width;
    let imgWidth = availableWidth;
    let imgHeight = imgWidth * canvasAspectRatio;

    // 이미지가 페이지 높이를 초과하는 경우 높이에 맞춰 조정
    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight / canvasAspectRatio;
    }

    // 이미지를 PDF에 추가 (중앙 정렬)
    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = margin;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

    // PDF 다운로드
    pdf.save(filename);
  } catch (error) {
    console.error('PDF 내보내기 실패:', error);
    throw new Error('PDF 내보내기에 실패했습니다.');
  }
};
