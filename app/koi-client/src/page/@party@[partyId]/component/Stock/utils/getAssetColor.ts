/**
 * 자산별 고정 색상 매핑
 * 각 자산이 항상 동일한 색상으로 표시되도록 해요
 */
export const getAssetColor = (assetName: string): string => {
  const colorMap: Record<string, string> = {
    // 터쿼이즈 - 안정적인 자산을 나타내는 차분한 색상
    // 주요 ETF/인덱스
    QQQ: '#FF6B6B',

    // 산호 핑크 - 기술주 중심의 활발한 느낌
    'S&P500': '#45B7D1',

    // 따뜻한 노랑 - 안전자산의 안정감
    TDF2060: '#DDA0DD',

    // 레드 - 밈코인의 위험성
    금: '#FFD700',

    // 페일 터쿼이즈 - 원화 안전자산
    미국달러SOFR: '#F7DC6F',

    // 골드 - 금의 본래 색상
    // 기타 자산
    '보유 자산 없음': '#CCCCCC',

    // 골든 옐로우 - 달러 자산
    // 대체투자/고위험자산
    비트코인: '#FF8C42',

    // 라벤더 - 목표일펀드의 계획성
    '원화 CMA': '#98D8C8',

    // 민트 그린 - 한국 시장
    // 채권/안전자산
    채권: '#FFEAA7',

    // 스카이 블루 - 안정적인 미국 시장
    코스피: '#96CEB4',

    // 오렌지 - 암호화폐의 역동성
    해삐코인: '#E74C3C',

    // 현금
    현금: '#4ECDC4', // 그레이 - 빈 상태
  };

  // 매핑된 색상이 있으면 반환, 없으면 기본 색상 중 하나를 해시 기반으로 선택
  if (colorMap[assetName]) {
    return colorMap[assetName];
  }

  // 기본 색상 팔레트에서 자산명 기반으로 일관된 색상 선택
  const defaultColors = [
    '#BB8FCE',
    '#85C1E9',
    '#F8C471',
    '#82E0AA',
    '#F1948A',
    '#85C1E9',
    '#D7BDE2',
    '#A9DFBF',
    '#F9E79F',
    '#FADBD8',
  ];

  const hash = assetName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return defaultColors[hash % defaultColors.length];
};
