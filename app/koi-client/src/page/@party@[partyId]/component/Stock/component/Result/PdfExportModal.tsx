import { XIcon } from 'lucide-react';
import { useState } from 'react';

interface PdfExportModalProps {
  onExport: (isHighQuality: boolean) => void;
  isExporting: boolean;
}

const PdfExportModal = ({ onExport, isExporting }: PdfExportModalProps) => {
  const [showQualityModal, setShowQualityModal] = useState(false);

  const handleOpenModal = () => {
    setShowQualityModal(true);
  };

  const handleCloseModal = () => {
    setShowQualityModal(false);
  };

  const handleExport = (isHighQuality: boolean) => {
    onExport(isHighQuality);
    setShowQualityModal(false);
  };

  return (
    <>
      {/* PDF 내보내기 버튼 */}
      <button
        onClick={handleOpenModal}
        disabled={isExporting}
        style={{
          backgroundColor: isExporting ? '#cccccc' : '#2563eb',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          fontFamily: 'DungGeunMo',
          fontSize: '14px',
          fontWeight: '500',
          letterSpacing: '0.02em',
          padding: '10px 14px',
          wordBreak: 'keep-all',
        }}
      >
        {isExporting ? '저장 중...' : 'PDF 저장'}
      </button>

      {/* 화질 선택 모달 */}
      {showQualityModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quality-modal-title"
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            left: 0,
            position: 'fixed',
            right: 0,
            top: 0,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1f2028',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              maxWidth: '400px',
              padding: '24px',
              width: '80%',
            }}
          >
            <div
              style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', margin: '0 0 16px 0' }}
            >
              <h3
                id="quality-modal-title"
                style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textAlign: 'center' }}
              >
                PDF 화질 선택
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                <XIcon size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 고화질 옵션 */}
              <button
                onClick={() => handleExport(true)}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '16px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>🖥️ 고화질 (PC 추천)</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>PC나 태블릿에서 보기 적합 • 용량 큼 • 선명한 화질</div>
              </button>

              {/* 저화질 옵션 */}
              <button
                onClick={() => handleExport(false)}
                style={{
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '16px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📱 저화질 (저용량 추천)</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>내용 읽기에 충분 • 용량 작음 • 빠른 다운로드</div>
              </button>
            </div>

            {/* 취소 버튼 */}
            <button
              onClick={handleCloseModal}
              style={{
                backgroundColor: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontFamily: 'DungGeunMo',
                fontSize: '14px',
                fontWeight: '500',
                marginTop: '12px',
                padding: '12px',
                width: '100%',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PdfExportModal;
