import { CompanyInfo, StockStorageSchema } from 'shared~type-stock';
import { CompanyName, formatPercentage } from '../../../../../utils/stock';

type TimeIdx = string;

type StockPortfolioValue = {
  /**
   * 현재 시점의 총 투자 금액
   */
  investmentPrice: number;
  /**
   * 현재 시점의 보유 주식 수량
   */
  stockCount: number;
  /**
   * 다음 시점의 주식 가격
   */
  nextStockPrice: number;
  /**
   * 다음 시점의 수익률
   */
  nextProfitRate: number;
};

type AllPortfolios = Record<TimeIdx, Record<CompanyName, StockPortfolioValue>>;

export const calculateAllPortfolios = ({
  stockStorages,
  companies,
}: {
  stockStorages: StockStorageSchema[];
  companies: Record<CompanyName, CompanyInfo[]>;
}): AllPortfolios => {
  // 시간별, 회사별 포트폴리오 정보를 저장할 객체
  const portfolios: AllPortfolios = {};

  // 각 주식 저장소(회사별 주식 보유 이력)를 순회해요
  stockStorages.forEach((storage) => {
    const { companyName, stockCountHistory } = storage;

    // 주식 수량 기록을 시간 인덱스별로 순회해요
    stockCountHistory.forEach((_, timeIdx) => {
      // 마지막 시점(인덱스 9)은 다음 가격 정보가 없어서 제외해요
      if (timeIdx === 9) return;

      // 현재 시점의 주식 가격
      const stockCurrentPrice = companies[companyName][timeIdx].가격;

      // 현재 시점까지 누적된 주식 보유 수량
      // 예: [10, 5, -3] 배열에서 timeIdx가 1이면 10 + 5 = 15개
      const stockCurrentCount = stockCountHistory
        .filter((_, idx) => idx <= timeIdx)
        .reduce((acc, curr) => acc + curr, 0);

      // 현재 시점의 총 투자 금액 (보유 수량 × 현재 가격)
      const stockPrice = stockCurrentCount * stockCurrentPrice;

      // 다음 시점의 주식 가격 (수익률 계산을 위해 필요)
      const nextStockPrice = companies[companyName][timeIdx + 1].가격;

      // 수익률 계산: (다음 가격 - 현재 가격) / 현재 가격 × 100
      // 주식을 보유하지 않은 경우 수익률은 0%
      const nextProfitRate =
        stockCurrentCount === 0 ? 0 : formatPercentage((nextStockPrice - stockCurrentPrice) / stockCurrentPrice);

      // 해당 시점의 포트폴리오 객체가 없으면 생성
      if (!portfolios[timeIdx]) {
        portfolios[timeIdx] = {};
      }

      // 계산된 주식 가치 정보를 포트폴리오에 저장
      portfolios[timeIdx][companyName] = {
        investmentPrice: stockPrice, // 총 투자 금액
        nextProfitRate, // 수익률 (%)
        nextStockPrice, // 다음 시점의 주식 가격
        stockCount: stockCurrentCount, // 다음 시점 주식 가격
      };
    });
  });

  return portfolios;
};
