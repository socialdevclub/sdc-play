import { Response, StockSchemaWithId } from 'shared~type-stock';

// 거래 기록 (FIFO 계산용)
interface Purchase {
  count: number;
  price: number;
}

/**
 * 전체 포트폴리오의 특정 연차 수익률을 계산해요 (FIFO 방식)
 * @param stock 주식 데이터
 * @param user 사용자 데이터
 * @param year 연차 (0부터 시작)
 * @returns 수익률 (%)
 */
export function calculateTotalPortfolioReturn(
  stock: StockSchemaWithId,
  user: Response.GetStockUser,
  year: number,
): number {
  let totalInvestedAmount = 0;
  let totalCurrentValue = 0;
  let totalRealizedProfitLoss = 0;

  // 모든 회사를 대상으로 계산
  user.stockStorages.forEach((storage) => {
    const { companyName, stockCountHistory } = storage;
    const companyPrices = stock.companies[companyName];

    if (!companyPrices || year >= stockCountHistory.length) return;

    let currentHolding = 0;
    let companyInvestedAmount = 0;
    let companyRealizedProfitLoss = 0;
    const purchases: Purchase[] = [];

    // 해당 연도까지의 거래 내역을 누적하여 계산
    for (let i = 0; i <= year; i++) {
      const tradeCount = stockCountHistory[i] || 0;
      const price = companyPrices[i]?.가격 || 0;

      if (tradeCount > 0) {
        // 매수: 투자 비용 증가, 보유량 증가
        companyInvestedAmount += tradeCount * price;
        currentHolding += tradeCount;
        purchases.push({ count: tradeCount, price });
      } else if (tradeCount < 0) {
        // 매도: 실현손익 계산 (FIFO 방식)
        let remainingSellCount = Math.abs(tradeCount);
        currentHolding -= remainingSellCount;

        while (remainingSellCount > 0 && purchases.length > 0) {
          const purchase = purchases[0];
          const sellFromThisPurchase = Math.min(remainingSellCount, purchase.count);

          // 실현손익 = (매도가 - 매수가) * 매도량
          companyRealizedProfitLoss += sellFromThisPurchase * (price - purchase.price);

          purchase.count -= sellFromThisPurchase;
          remainingSellCount -= sellFromThisPurchase;

          if (purchase.count === 0) {
            purchases.shift();
          }
        }
      }
    }

    // 전체 포트폴리오에 반영
    totalInvestedAmount += companyInvestedAmount;
    totalCurrentValue += currentHolding * (companyPrices[year]?.가격 || 0);
    totalRealizedProfitLoss += companyRealizedProfitLoss;
  });

  // 수익률 계산
  if (totalInvestedAmount > 0) {
    const totalAssetValue = totalCurrentValue + totalRealizedProfitLoss;
    const returnRate = ((totalAssetValue - totalInvestedAmount) / totalInvestedAmount) * 100;
    return Math.round(returnRate * 10) / 10;
  }

  return 0;
}
