export const COMPANY_NAMES = {
  '고양기획🐈': '고양기획🐈',
  '꿀벌생명🐝': '꿀벌생명🐝',
  '늑대통신🐺': '늑대통신🐺',
  '멍멍제과🐶': '멍멍제과🐶',
  '수달물산🦦': '수달물산🦦',
  '여우은행🦊': '여우은행🦊',
  '용용카드🐲': '용용카드🐲',
  '토끼건설🐰': '토끼건설🐰',
  '햄찌금융🐹': '햄찌금융🐹',
  '호랑전자🐯': '호랑전자🐯',
} as const;
export type CompanyNames = string;

/**
 * 랜덤하게 회사 이름을 선택하여 반환하는 함수
 * @param {number} [length] - 반환할 회사 이름의 개수. 미지정시 전체 회사 반환. 최대 10까지
 * @returns {string[]} 선택된 회사 이름 배열
 */
export const getRandomCompanyNames = (length?: number): string[] => {
  const names = Object.keys(COMPANY_NAMES).map((key) => key);
  names.sort(() => Math.random() - 0.5);
  const result = names.splice(0, length ?? names.length);
  return result;
};

export const INIT_STOCK_PRICE = 100000;

export const LOAN_PRICE = 1_000_000;
export const BOUNDARY_LOAN_PRICE = 1_000_000;
export const SETTLE_LOAN_PRICE = 2_000_000;

export const DEFAULT_DRAW_COST = 300_000;
export const ROUND_SKIP_STEP = 2;

export const MAX_STOCK_IDX = 9;
