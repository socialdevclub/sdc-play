import { StockConfig } from 'shared~config';
import { Response, StockSchemaWithId } from 'shared~type-stock';

/**
 * 특정 연차의 포트폴리오 구성 비중을 계산해요
 *
 * 이 함수는 사용자가 특정 연차에 보유한 모든 자산(주식 + 현금)의 구성과 가치를 계산해요.
 * 각 회사별 주식은 누적 보유량(매수 - 매도)을 기준으로 하며, 현재 시장 가격을 적용해서
 * 포트폴리오 가치를 산출해요.
 *
 * @param stock 주식 데이터 - 각 회사별 연차별 가격 정보를 포함
 * @param user 사용자 데이터 - 주식 거래 이력과 현금 보유 이력을 포함
 * @param year 연차 (0부터 시작) - 계산하고자 하는 시점
 *
 * @returns 포트폴리오 구성 정보
 * @returns companies - 보유 자산 목록 (회사명과 해당 자산의 시장 가치)
 * @returns companies[].name - 자산명 (회사명 또는 '현금', 빈 경우 '보유 자산 없음')
 * @returns companies[].value - 해당 자산의 현재 시장 가치 (원 단위, 정수로 반올림)
 * @returns isEmpty - 포트폴리오가 비어있는지 여부 (주식도 현금도 없으면 true)
 *
 * @example
 * // 0년차 포트폴리오 조회
 * const result = calculatePortfolioAllocation(stockData, userData, 0);
 * // result.companies = [
 * //   { name: 'QQQ', value: 10000000 },      // 100주 × 100,000원
 * //   { name: '채권', value: 9000000 },       // 90주 × 100,000원
 * //   { name: '현금', value: 35100000 }       // 현금 보유량
 * // ]
 * // result.isEmpty = false
 */
export function calculatePortfolioAllocation(
  stock: StockSchemaWithId,
  user: Response.GetStockUser,
  year: number,
): {
  companies: Array<{ name: string; value: number }>;
  isEmpty: boolean;
} {
  const companiesPortfolio: Array<{ name: string; value: number }> = [];
  let isEmpty = true;

  // 1단계: 각 회사별 누적 주식 보유량 계산 및 포트폴리오 가치 산출
  user.stockStorages.forEach((storage) => {
    const { companyName, stockCountHistory } = storage;
    const companyPrices = stock.companies[companyName];

    // 해당 회사의 가격 정보가 없거나 연차가 범위를 벗어나면 스킵
    if (!companyPrices || year >= stockCountHistory.length) return;

    // 해당 연차까지의 누적 보유량 계산 (매수 +, 매도 -)
    // 예: [100, 30, 0, -4] → 0년차:100주, 1년차:130주, 2년차:130주, 3년차:126주
    let cumulativeHolding = 0;
    for (let i = 0; i <= Math.min(year, StockConfig.MAX_STOCK_IDX - 1); i++) {
      cumulativeHolding += stockCountHistory[i] || 0;
    }

    // 보유량이 양수이고 해당 연차의 가격 정보가 있는 경우만 포트폴리오에 포함
    if (cumulativeHolding > 0 && companyPrices[year]) {
      // 현재 시장 가치 = 보유량 × 현재 가격
      const portfolioValue = cumulativeHolding * companyPrices[year].가격;
      isEmpty = false; // 보유 자산이 있음을 표시

      companiesPortfolio.push({
        name: companyName,
        value: Math.round(portfolioValue), // 원 단위로 반올림
      });
    }
  });

  // 2단계: 현금 보유량 추가
  const cashAmount = user.moneyHistory[Math.min(year, StockConfig.MAX_STOCK_IDX - 1)];
  if (cashAmount && cashAmount > 0) {
    isEmpty = false; // 현금이 있으면 빈 포트폴리오가 아님
    companiesPortfolio.push({
      name: '현금',
      value: Math.round(cashAmount), // 현금도 원 단위로 반올림
    });
  }

  // 3단계: 포트폴리오가 완전히 비어있는 경우 처리
  if (isEmpty) {
    return {
      companies: [{ name: '보유 자산 없음', value: 1 }], // 차트 표시용 더미 데이터
      isEmpty,
    };
  }

  // 4단계: 정상적인 포트폴리오 반환
  return {
    companies: companiesPortfolio,
    isEmpty,
  };
}

/**
 * 모든 게임 내 종목을 포함한 포트폴리오 구성을 계산해요
 * 보유량이 0인 종목도 0원으로 표시해서 전체 종목 현황을 볼 수 있어요
 *
 * @param stock 주식 데이터 - 각 회사별 연차별 가격 정보를 포함
 * @param user 사용자 데이터 - 주식 거래 이력과 현금 보유 이력을 포함
 * @param year 연차 (0부터 시작) - 계산하고자 하는 시점
 *
 * @returns 포트폴리오 구성 정보
 * @returns companies - 모든 게임 내 자산 목록 (회사명과 해당 자산의 시장 가치, 보유량 0인 경우도 포함)
 * @returns companies[].name - 자산명 (회사명 또는 '현금')
 * @returns companies[].value - 해당 자산의 현재 시장 가치 (원 단위, 정수로 반올림, 보유량 0이면 0)
 * @returns isEmpty - 포트폴리오가 비어있는지 여부 (주식도 현금도 없으면 true)
 */
export function calculatePortfolioAllocationWithAllStocks(
  stock: StockSchemaWithId,
  user: Response.GetStockUser,
  year: number,
): {
  companies: Array<{ name: string; value: number }>;
  isEmpty: boolean;
} {
  const companiesPortfolio: Array<{ name: string; value: number }> = [];
  let isEmpty = true;

  // 1단계: 모든 게임 내 회사에 대해 포트폴리오 가치 계산
  const allCompanyNames = Object.keys(stock.companies);

  allCompanyNames.forEach((companyName) => {
    const companyPrices = stock.companies[companyName];

    // 해당 회사의 가격 정보가 없거나 연차가 범위를 벗어나면 0원으로 처리
    if (!companyPrices || year >= companyPrices.length) {
      companiesPortfolio.push({
        name: companyName,
        value: 0,
      });
      return;
    }

    // 사용자가 해당 회사에 대한 거래 이력이 있는지 확인
    const userStorage = user.stockStorages.find((storage) => storage.companyName === companyName);

    if (!userStorage || year >= userStorage.stockCountHistory.length) {
      // 거래 이력이 없으면 0원으로 처리
      companiesPortfolio.push({
        name: companyName,
        value: 0,
      });
      return;
    }

    // 해당 연차까지의 누적 보유량 계산 (매수 +, 매도 -)
    let cumulativeHolding = 0;
    for (let i = 0; i <= Math.min(year, StockConfig.MAX_STOCK_IDX - 1); i++) {
      cumulativeHolding += userStorage.stockCountHistory[i] || 0;
    }

    // 현재 시장 가치 = 보유량 × 현재 가격 (보유량이 0이면 0원)
    const portfolioValue = cumulativeHolding > 0 ? cumulativeHolding * companyPrices[year].가격 : 0;

    if (portfolioValue > 0) {
      isEmpty = false; // 보유 자산이 있음을 표시
    }

    companiesPortfolio.push({
      name: companyName,
      value: Math.round(portfolioValue), // 원 단위로 반올림
    });
  });

  // 2단계: 현금 보유량 추가
  const cashAmount = user.moneyHistory[Math.min(year, StockConfig.MAX_STOCK_IDX - 1)];
  const cashValue = cashAmount && cashAmount > 0 ? cashAmount : 0;

  if (cashValue > 0) {
    isEmpty = false; // 현금이 있으면 빈 포트폴리오가 아님
  }

  companiesPortfolio.push({
    name: '현금',
    value: Math.round(cashValue), // 현금도 원 단위로 반올림
  });

  // 3단계: 포트폴리오가 완전히 비어있는 경우 처리
  if (isEmpty) {
    return {
      companies: [{ name: '보유 자산 없음', value: 1 }], // 차트 표시용 더미 데이터
      isEmpty,
    };
  }

  // 4단계: 정상적인 포트폴리오 반환 (가치 순으로 정렬)
  return {
    companies: companiesPortfolio.sort((a, b) => b.value - a.value),
    isEmpty,
  };
}
