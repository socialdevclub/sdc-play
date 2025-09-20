import { Response, StockSchemaWithId } from 'shared~type-stock';
import { calculateTotalPortfolioReturn } from './calculateTotalPortfolioReturn';

/**
 * 0~9년차의 전체 포트폴리오 수익률 데이터를 계산해요
 * @param stock 주식 데이터
 * @param user 사용자 데이터
 * @returns 연차별 수익률과 연차 라벨
 */
export function calculateTotalReturnsData(
  stock: StockSchemaWithId,
  user: Response.GetStockUser,
): { returns: number[]; years: string[] } {
  const years = Array.from({ length: 10 }, (_, i) => `${i}년차`);
  const returns: number[] = [];

  for (let year = 0; year < 10; year++) {
    const returnRate = calculateTotalPortfolioReturn(stock, user, year);
    returns.push(returnRate);
  }

  return { returns, years };
}
