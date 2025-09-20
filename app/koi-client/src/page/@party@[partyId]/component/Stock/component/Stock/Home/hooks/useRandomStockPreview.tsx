import { objectEntries } from '@toss/utils';
import { StockSchema } from 'shared~type-stock';
import { GetStock } from 'shared~type-stock/Response';

const TOTAL_ROUND_COUNT = 10;

// 판매량이 낮은 회사 필터링
const getLowSalesCompanie = (
  remainingStocks: StockSchema['remainingStocks'],
): { companyName: string; quantity: number } => {
  const lowSalesCompanie = [...objectEntries(remainingStocks)].sort(([, a], [, b]) => b - a)[0];
  return {
    companyName: lowSalesCompanie[0],
    quantity: lowSalesCompanie[1],
  };
};

export const useRandomStockPreview = (
  stockId: string,
  userId?: string,
  timeIdx?: number,
  stock?: GetStock,
): {
  nextRoundPredict: { companyName: string; predictTime: number; priceVariation: number } | null;
  TOTAL_ROUND_COUNT: number;
} => {
  if (!userId || !stock?.companies) {
    return { TOTAL_ROUND_COUNT, nextRoundPredict: null };
  }

  const { companyName } = getLowSalesCompanie(stock.remainingStocks);

  const getPredictedStockInfo = (): { companyName: string; predictTime: number; priceVariation: number } | null => {
    const _timeIdx = timeIdx ?? 0;

    if (_timeIdx < 0 || _timeIdx >= TOTAL_ROUND_COUNT - 1) {
      return null;
    }

    return {
      companyName,
      predictTime: stock.fluctuationsInterval ? (_timeIdx + 1) * stock.fluctuationsInterval : 0,
      priceVariation: Math.abs(
        (stock.companies?.[companyName]?.[_timeIdx + 1]?.가격 ?? 0) -
          (stock.companies?.[companyName]?.[_timeIdx]?.가격 ?? 0),
      ),
    };
  };

  const nextRoundPredict = getPredictedStockInfo();

  return {
    TOTAL_ROUND_COUNT,
    nextRoundPredict,
  };
};
