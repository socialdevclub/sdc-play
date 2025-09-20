import { Response, StockSchemaWithId } from 'shared~type-stock';
import { StockConfig } from 'shared~config';
import { calculatePortfolioAllocationWithAllStocks } from './calculatePortfolioAllocation';

/**
 * 0~0년차의 연차별 포트폴리오 구성 데이터를 계산해요
 * @param stock 주식 데이터
 * @param user 사용자 데이터
 * @returns 연차별 포트폴리오 구성 배열
 */
export function calculateInvestmentData(
  stock: StockSchemaWithId,
  user: Response.GetStockUser,
): Array<{ year: string; companies: Array<{ name: string; value: number }> }> {
  const yearlyData: Array<{ year: string; companies: Array<{ name: string; value: number }> }> = [];

  // 0~8년차 각각의 포트폴리오 구성 계산
  for (let year = 0; year < StockConfig.MAX_STOCK_IDX + 1; year++) {
    const allocation = calculatePortfolioAllocationWithAllStocks(stock, user, year);

    yearlyData.push({
      companies: allocation.companies,
      year: `${year}년차`,
    });
  }

  return yearlyData;
}
