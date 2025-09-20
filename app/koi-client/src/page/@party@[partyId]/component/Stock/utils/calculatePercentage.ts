/**
 * 비율 계산 및 포맷팅을 위한 유틸리티 함수들이에요
 */

/**
 * 기본 비율을 계산해요 (value / total * 100)
 * @param value 계산할 값
 * @param total 전체 값
 * @returns 퍼센트 비율 (0-100 사이의 숫자)
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * 변화율을 계산해요 ((current - previous) / previous * 100)
 * @param current 현재 값
 * @param previous 이전 값
 * @returns 변화율 퍼센트 (양수는 증가, 음수는 감소)
 */
export const calculateChangeRate = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * 퍼센트 값을 문자열로 포맷팅해요
 * @param percentage 퍼센트 값
 * @param options 포맷팅 옵션
 * @param options.decimalPlaces 소수점 자릿수 (기본값: 2)
 * @param options.showSign 양수일 때 + 기호 표시 여부 (기본값: false)
 * @param options.showPercent % 기호 표시 여부 (기본값: true)
 * @returns 포맷팅된 퍼센트 문자열
 */
export const formatPercentage = (
  percentage: number,
  options: {
    decimalPlaces?: number;
    showSign?: boolean;
    showPercent?: boolean;
  } = {},
): string => {
  const { decimalPlaces = 2, showSign = false, showPercent = true } = options;

  const formattedNumber = percentage.toFixed(decimalPlaces);
  const sign = showSign && percentage > 0 ? '+' : '';
  const percent = showPercent ? '%' : '';

  return `${sign}${formattedNumber}${percent}`;
};

/**
 * 변화율을 계산하고 포맷팅해요
 * @param current 현재 값
 * @param previous 이전 값
 * @param options 포맷팅 옵션
 * @returns 포맷팅된 변화율 문자열
 */
export const formatChangeRate = (
  current: number,
  previous: number,
  options: {
    decimalPlaces?: number;
    showSign?: boolean;
  } = {},
): string => {
  const changeRate = calculateChangeRate(current, previous);
  return formatPercentage(changeRate, { ...options, showSign: true });
};

/**
 * 비율을 계산하고 포맷팅해요
 * @param value 계산할 값
 * @param total 전체 값
 * @param options 포맷팅 옵션
 * @returns 포맷팅된 비율 문자열
 */
export const formatRatio = (
  value: number,
  total: number,
  options: {
    decimalPlaces?: number;
  } = {},
): string => {
  const percentage = calculatePercentage(value, total);
  return formatPercentage(percentage, options);
};
