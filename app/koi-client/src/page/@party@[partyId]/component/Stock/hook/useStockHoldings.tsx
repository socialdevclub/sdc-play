import { useMemo } from 'react';
import { formatPercentage } from '../../../../../utils/stock';
import useQueryStock from '../../../../../hook/query/Stock/useQueryStock'; // 경로는 실제 프로젝트 구조에 맞게 수정해주세요
import useUserFindOne from '../../../../../hook/query/Stock/useUserFindOne'; // 경로는 실제 프로젝트 구조에 맞게 수정해주세요

/**
 * 사용자가 보유한 주식의 상세 정보를 나타내는 인터페이스
 * @interface StockHolding
 */
interface StockHolding {
  /** 회사 이름 (예: "고양기획🐈") */
  companyName: string;
  /** 보유 중인 주식 수량 */
  stockCount: number;
  /** 평균 구매 가격 */
  averagePrice: number;
  /** 손익 금액 (현재 가치 - 총 투자금액) */
  profitLoss: number;
  /** 손익률(%) ((현재 가치 - 총 투자금액) / 총 투자금액) * 100 */
  profitLossPercentage: number;
  /** 현재 주식 가격 */
  currentPrice: number;
  /** 총 투자 금액 */
  totalInvestment: number;
  /** 현재 총 가치 (현재 가격 * 보유 수량) */
  totalValue: number;
}

/**
 * useStockHoldings 훅의 파라미터 인터페이스
 * @interface Props
 */
interface Props {
  /** 주식 게임의 고유 ID */
  stockId: string | undefined;
  /** 사용자의 고유 ID */
  userId: string | undefined;
}

/**
 * 사용자의 주식 보유 정보를 계산하는 커스텀 훅
 *
 * @param props - 훅 파라미터 객체
 * @returns 보유 주식 정보, 로딩 상태, 총 보유가치, 총 손익, 총 투자금액을 포함하는 객체
 *
 * @example
 * // 기본 사용법
 * const { holdings, isLoading, totalHoldings } = useStockHoldings({
 *   stockId: '7c623500-5517-4cfe-ad89-243fef5ec9a9',
 *   userId: '8c35e8af-2340-4883-83aa-35bd6cd8f7e8'
 * });
 *
 * // 로딩 상태 처리
 * if (isLoading) {
 *   return <div>로딩 중...</div>;
 * }
 *
 * // 보유 주식이 없는 경우
 * if (holdings.length === 0) {
 *   return <div>보유 중인 주식이 없습니다.</div>;
 * }
 *
 * // 주식 정보 사용
 * return (
 *   <div>
 *     <p>총 보유가치: {totalHoldings}</p>
 *     <ul>
 *       {holdings.map(stock => (
 *         <li key={stock.companyName}>
 *           {stock.companyName}: {stock.stockCount}주,
 *           평균가 {stock.averagePrice},
 *           손익 {stock.profitLoss}원 ({stock.profitLossPercentage}%)
 *         </li>
 *       ))}
 *     </ul>
 *   </div>
 * );
 */
const useStockHoldings = ({ stockId, userId }: Props) => {
  // 주식 정보 가져오기
  const { companiesPrice, data: stockData } = useQueryStock(stockId);

  // 사용자의 주식 보유 정보 가져오기
  const { data: userData } = useUserFindOne(stockId, userId);

  // 주식 보유 정보 계산
  const holdings = useMemo(() => {
    if (!stockData || !userData || !companiesPrice) {
      return [];
    }

    // 사용자가 보유한 주식과 각 주식의 매수 기록을 추적
    const result: StockHolding[] = [];

    // userData.stockStorages에서 현재 보유 중인 주식만 필터링
    const heldStocks = userData.stockStorages.filter((storage) => storage.stockCountCurrent > 0);

    for (const stock of heldStocks) {
      const { companyName, stockAveragePrice, stockCountCurrent } = stock;

      // 현재 가격 확인
      const currentPrice = companiesPrice[companyName] || 0;

      // 평균 구매 가격
      const averagePrice = stockAveragePrice;

      // 보유 수량의 총 투자 비용 (평균 구매 가격 * 총 구매 수량)
      const totalCost = Math.round(averagePrice * stockCountCurrent);

      // 현재 총 가치 (현재 가격 * 총 구매 수량)
      const totalValue = currentPrice * stockCountCurrent;

      // 손익 계산 (현재 총 가치 - 총 투자 비용)
      const profitLoss = totalValue - totalCost;

      // 손익률 계산 (퍼센트)
      const profitLossPercentage = totalCost > 0 ? formatPercentage(profitLoss / totalCost) : 0;

      result.push({
        averagePrice,
        companyName,
        currentPrice,
        profitLoss,
        profitLossPercentage,
        stockCount: stockCountCurrent,
        totalInvestment: totalCost,
        totalValue,
      });
    }

    return result;
  }, [stockData, userData, companiesPrice]);

  return {
    holdings,
    isLoading: !stockData || !userData,
    totalHoldings: holdings.reduce((sum, item) => sum + item.totalValue, 0),
    totalInvestment: holdings.reduce((sum, item) => sum + item.totalInvestment, 0),
    totalProfitLoss: holdings.reduce((sum, item) => sum + item.profitLoss, 0),
  };
};

export default useStockHoldings;
