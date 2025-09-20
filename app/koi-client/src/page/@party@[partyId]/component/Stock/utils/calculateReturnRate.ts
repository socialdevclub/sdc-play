/**
 * 회사별 라운드별 수익률을 계산하는 유틸리티 함수들
 */

// 타입 정의
interface StockPrice {
  가격: number;
  정보: unknown[];
}

interface StockStorage {
  companyName: string;
  stockAveragePrice: number;
  stockAveragePriceHistory: number[];
  stockCountCurrent: number;
  stockCountHistory: number[];
}

interface StockData {
  companies: Record<string, StockPrice[]>;
}

interface UserData {
  stockStorages: StockStorage[];
}

/**
 * 특정 회사의 특정 라운드에서의 수익률을 계산해요
 * @param stockData - 주식 시장 데이터
 * @param userData - 사용자 투자 데이터
 * @param companyName - 회사명
 * @param roundIdx - 라운드 인덱스 (0부터 시작)
 * @returns 수익률(%), 계산할 수 없는 경우 null 반환
 */
export const calculateCompanyReturnRate = (
  stockData: StockData,
  userData: UserData,
  companyName: string,
  roundIdx: number,
): number | null => {
  // 0 라운드의 경우 수익률은 0
  if (roundIdx === 0) return null;

  // 회사 데이터가 없는 경우
  const companyPrices = stockData.companies[companyName];
  if (!companyPrices) return null;

  // 현재 라운드 가격이 없는 경우
  if (roundIdx >= companyPrices.length) return null;

  // 사용자의 해당 회사 투자 정보 찾기
  const userStock = userData.stockStorages.find((stock) => stock.companyName === companyName);
  if (!userStock) return null;

  // 이전 라운드의 평균 매수가격
  const previousAveragePrice = userStock.stockAveragePriceHistory[roundIdx - 1];
  if (!previousAveragePrice) return null;

  // 현재 라운드의 시장 가격
  const currentRoundPrice = companyPrices[roundIdx].가격;

  // 수익률 계산: (현재 라운드 가격 - 이전 라운드 평균 매수가격) / 이전 라운드 평균 매수가격 * 100
  const returnRate = ((currentRoundPrice - previousAveragePrice) / previousAveragePrice) * 100;

  return Number(returnRate.toFixed(2));
};

/**
 * 모든 회사의 특정 라운드에서의 수익률을 계산해요
 * @param stockData - 주식 시장 데이터
 * @param userData - 사용자 투자 데이터
 * @param roundIdx - 라운드 인덱스 (0부터 시작)
 * @returns 회사별 수익률 객체
 */
export const calculateAllCompaniesReturnRate = (
  stockData: StockData,
  userData: UserData,
  roundIdx: number,
): Record<string, number> => {
  const companies = Object.keys(stockData.companies);

  return companies.reduce((result, companyName) => {
    const returnRate = calculateCompanyReturnRate(stockData, userData, companyName, roundIdx);
    if (returnRate !== null) {
      result[companyName] = returnRate;
    }
    return result;
  }, {} as Record<string, number>);
};

/**
 * 특정 회사의 모든 라운드별 수익률을 계산해요
 * @param stockData - 주식 시장 데이터
 * @param userData - 사용자 투자 데이터
 * @param companyName - 회사명
 * @returns 라운드별 수익률 배열
 */
export const calculateCompanyAllRoundsReturnRate = (
  stockData: StockData,
  userData: UserData,
  companyName: string,
): (number | null)[] => {
  const companyPrices = stockData.companies[companyName];
  if (!companyPrices) return [];

  const result: (number | null)[] = [];

  // 모든 라운드 계산 (0 라운드는 0, 나머지는 이전 라운드 대비 수익률)
  for (let i = 0; i < companyPrices.length; i++) {
    result.push(calculateCompanyReturnRate(stockData, userData, companyName, i));
  }

  return result;
};

/**
 * 모든 회사의 모든 라운드별 수익률을 계산해요
 * @param stockData - 주식 시장 데이터
 * @param userData - 사용자 투자 데이터
 * @returns 회사별, 라운드별 수익률 객체
 */
export const calculateAllReturnRates = (
  stockData: StockData,
  userData: UserData,
): Record<string, (number | null)[]> => {
  const companies = Object.keys(stockData.companies);

  return companies.reduce((result, companyName) => {
    result[companyName] = calculateCompanyAllRoundsReturnRate(stockData, userData, companyName);
    return result;
  }, {} as Record<string, (number | null)[]>);
};

/**
 * 특정 라운드에서 가장 높은 수익률을 가진 회사를 찾아요
 * @param stockData - 주식 시장 데이터
 * @param userData - 사용자 투자 데이터
 * @param roundIdx - 라운드 인덱스 (0부터 시작)
 * @returns 최고 수익률 회사 정보 또는 null
 */
export const getBestPerformingCompany = (
  stockData: StockData,
  userData: UserData,
  roundIdx: number,
): { company: string; rate: number } | null => {
  const allReturnRates = calculateAllCompaniesReturnRate(stockData, userData, roundIdx);

  if (Object.keys(allReturnRates).length === 0) return null;

  const bestCompany = Object.entries(allReturnRates).reduce(
    (best, [company, rate]) => {
      return rate > best.rate ? { company, rate } : best;
    },
    { company: '', rate: -Infinity },
  );

  return bestCompany.rate === -Infinity ? null : bestCompany;
};

/**
 * 특정 라운드에서 가장 낮은 수익률을 가진 회사를 찾아요
 * @param stockData - 주식 시장 데이터
 * @param userData - 사용자 투자 데이터
 * @param roundIdx - 라운드 인덱스 (0부터 시작)
 * @returns 최저 수익률 회사 정보 또는 null
 */
export const getWorstPerformingCompany = (
  stockData: StockData,
  userData: UserData,
  roundIdx: number,
): { company: string; rate: number } | null => {
  const allReturnRates = calculateAllCompaniesReturnRate(stockData, userData, roundIdx);

  if (Object.keys(allReturnRates).length === 0) return null;

  const worstCompany = Object.entries(allReturnRates).reduce(
    (worst, [company, rate]) => {
      return rate < worst.rate ? { company, rate } : worst;
    },
    { company: '', rate: Infinity },
  );

  return worstCompany.rate === Infinity ? null : worstCompany;
};
