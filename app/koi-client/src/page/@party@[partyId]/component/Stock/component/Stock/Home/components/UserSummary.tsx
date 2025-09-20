import { commaizeNumber } from '@toss/utils';
import Card from '../../../../../../../../component-presentation/Card';
import * as COLOR from '../../../../../../../../config/color';
import { formatPercentage } from '../../../../../../../../utils/stock';
import { 게임모드 } from '../../../../constant';
import { type UseStockInfo } from '../hooks/useStockInfo';
import { BEARISH_COLOR, BULLISH_COLOR } from '../../../../color';

// 상수 분리
const TITLE_MAP = {
  모두팔고난뒤의금액: {
    // 총액, 총자산
    // (잔액 + 주식가치)
    // (user.money + allSellPrice)
    [게임모드.STOCK]: '모두 팔고 난 뒤의 금액',
    [게임모드.REALISM]: '총자산', // 사용 안함
  },
  모두팔고난뒤의순이익: {
    // 초기금액 대비 현재 순수익률
    // (moneyRatio)
    [게임모드.STOCK]: '모두 팔고 난 뒤의 순이익',
    [게임모드.REALISM]: '총 이익', // 사용 안함
  },
  잔액: {
    // 현재 보유금(현금)
    // (user.money)
    [게임모드.STOCK]: '잔액',
    [게임모드.REALISM]: '주문 가능 금액',
  },
  주식가치: {
    // 현재 총 보유 주식 가치
    // (allSellPrice)
    [게임모드.STOCK]: '주식 가치',
    [게임모드.REALISM]: '평가금',
  },
  투자비용: {
    // 현재 보유 중인 주식의 총 구매 비용
    // (totalInvestment)
    [게임모드.STOCK]: '총 투자 비용', // 사용 안함
    [게임모드.REALISM]: '매입금',
  },
  현재주식수익: {
    // 보유 주식의 투자 비용 대비 순수익금, 순수익률
    // (주식가치 - 투자비용) & (주식가치/투자비용 * 100)
    // (totalProfitLoss) & (totalProfitLoss / totalInvestment) * 100)
    [게임모드.STOCK]: '현재 주식 수익', // 사용 안함
    [게임모드.REALISM]: '순수익',
  },
} as const;

// 타입 정의 개선
type UserSummaryProps = Pick<
  UseStockInfo,
  'user' | 'users' | 'userId' | 'allUserSellPriceDesc' | 'allProfitDesc' | 'stock'
> & {
  moneyRatio: string;
  allSellPrice: number;
  totalInvestment: number;
  totalProfitLoss: number;
};

// 유틸리티 함수들 추출
const formatCurrency = (amount: number): string => `₩${commaizeNumber(amount)}`;

const calculateProfitLossPercentage = (totalProfitLoss: number, totalInvestment: number): number => {
  if (totalInvestment <= 0) return 0;
  return formatPercentage(totalProfitLoss / totalInvestment);
};

const formatProfitLossPercentage = (totalProfitLoss: number, percentage: number): string => {
  const sign = totalProfitLoss > 0 ? '+' : '';
  return `${sign}${percentage}%`;
};

const getProfitLossColor = (percentage: number): string => {
  if (percentage > 0) return BULLISH_COLOR;
  if (percentage < 0) return BEARISH_COLOR;
  return '#FFFFFF';
};

const getRankComponent = (isVisibleRank: boolean, rankIndex: number | undefined): JSX.Element | null => {
  if (!isVisibleRank || rankIndex === undefined) return null;
  return <>{rankIndex + 1}위</>;
};

const UserSummary = ({
  user,
  users,
  userId,
  allSellPrice,
  allUserSellPriceDesc,
  moneyRatio,
  allProfitDesc,
  stock,
  totalInvestment,
  totalProfitLoss,
}: UserSummaryProps) => {
  if (!user || !stock) return null;

  const totalProfitLossPercentage = calculateProfitLossPercentage(totalProfitLoss, totalInvestment);
  const formattedProfitLossPercentage = formatProfitLossPercentage(totalProfitLoss, totalProfitLossPercentage);

  // 순위 계산 함수들
  const getMoneyRank = (): number | undefined => {
    if (!users) return undefined;
    return users.sort((a, b) => b.money - a.money).findIndex((v) => v.userId === userId);
  };

  const getStockValueRank = (): number => {
    return allUserSellPriceDesc().findIndex((v) => v.userId === userId);
  };

  const getProfitRank = (): number => {
    return allProfitDesc.findIndex((v) => v.userId === userId);
  };

  return (
    <>
      {/* <MyLevel moneyRatio={moneyRatio} initialMoney={stock.initialMoney} /> */}

      {/* 잔액 카드 */}
      <Card
        title={TITLE_MAP.잔액[stock.gameMode]}
        value={formatCurrency(user.money)}
        valueColor={COLOR.pastelGreen}
        rightComponent={getRankComponent(stock.isVisibleRank, getMoneyRank())}
      />

      {/* 주식 가치 카드 */}
      <Card
        title={TITLE_MAP.주식가치[stock.gameMode]}
        value={formatCurrency(allSellPrice)}
        valueColor={COLOR.pastelViolet}
        rightComponent={getRankComponent(stock.isVisibleRank, getStockValueRank())}
      />

      {/* STOCK 게임모드 전용 카드들 */}
      {stock.gameMode === 게임모드.STOCK && (
        <>
          <Card
            title={TITLE_MAP.모두팔고난뒤의금액[stock.gameMode]}
            value={formatCurrency(user.money + allSellPrice)}
            rightComponent={getRankComponent(stock.isVisibleRank, getProfitRank())}
          />
          <Card
            title={TITLE_MAP.모두팔고난뒤의순이익[stock.gameMode]}
            value={`${moneyRatio}%`}
            rightComponent={getRankComponent(stock.isVisibleRank, getProfitRank())}
          />
        </>
      )}

      {/* REALISM 게임모드 전용 카드들 */}
      {stock.gameMode === 게임모드.REALISM && (
        <>
          <Card title={TITLE_MAP.투자비용[stock.gameMode]} value={formatCurrency(totalInvestment)} />
          <Card
            title={TITLE_MAP.현재주식수익[stock.gameMode]}
            value={`${formatCurrency(totalProfitLoss)} (${formattedProfitLossPercentage})`}
            valueColor={getProfitLossColor(totalProfitLossPercentage)}
          />
        </>
      )}
    </>
  );
};

export default UserSummary;
