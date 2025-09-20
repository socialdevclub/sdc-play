import { getDateDistance } from '@toss/date';
import { objectEntries } from '@toss/utils';
import dayjs from 'dayjs';
import { CompanyInfo, StockStorageSchema } from 'shared~type-stock';
import { GetStock } from 'shared~type-stock/Response';
import {
  ANIMAL_NAME,
  REMAINING_STOCK_THRESHOLD,
  STOCK_PER_USER,
  STOCK_TRADE_STATUS,
  StockTradeStatus,
  TRADE,
} from '../config/stock';
import prependZero from '../service/prependZero';

export const getLowSalesCompanies = (
  remainingStocks: Record<string, number>,
  userCount: number,
  stockPerUser = STOCK_PER_USER,
): string[] => {
  const maxQuantity = (userCount ?? 1) * stockPerUser;
  return objectEntries(remainingStocks)
    .filter(([, remaining]) => remaining > maxQuantity * REMAINING_STOCK_THRESHOLD)
    .map(([company]) => company);
};

/**
 * 게임 시작 시간으로부터 현재까지 경과한 시간을 'MM:SS' 형식으로 반환합니다.
 *
 * @param startTime - 게임 시작 시간 (ISO 8601 형식의 문자열)
 * @returns 경과 시간을 'MM:SS' 형식으로 반환. 시작 시간이 없으면 '00:00' 반환
 *
 * @example getFormattedGameTime("2025-03-08T02:03:59+09:00"); // "51:49"
 */
export const getFormattedGameTime = (startTime?: string): string => {
  if (!startTime) return '00:00';

  return `${prependZero(getDateDistance(dayjs(startTime).toDate(), new Date()).minutes, 2)}:${prependZero(
    getDateDistance(dayjs(startTime).toDate(), new Date()).seconds,
    2,
  )}`;
};

export const generateNumberFromString = (str: string): number => {
  return str.split('').reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
};

export function calculateProfitRate(currentPrice: number, averagePrice: number): number {
  if (averagePrice === 0) return 0;

  const profitRate = ((currentPrice - averagePrice) / averagePrice) * 100;

  return Math.round(profitRate * 10) / 10;
}

export const formatPercentage = (value: number): number => {
  return Math.round(value * 100 * 10) / 10;
};

/**
 * 주식 정보 메시지 타입
 */
export interface GetStockMessagesParams {
  stockInfos: Array<{
    company: string;
    timeIdx: number;
    price: number;
  }>;
  currentTimeIdx: number;
  companyName: string;
}

/**
 * 주식 정보에 따른 메시지 배열을 생성합니다.
 *
 * @param params 메시지 생성에 필요한 파라미터
 * @returns 메시지 문자열 배열
 */
export const getStockMessages = (params: GetStockMessagesParams): string[] => {
  const { stockInfos, currentTimeIdx, companyName } = params;

  if (!companyName) return [];

  // 다음 주기의 주식 정보 찾기
  const nextInfo = stockInfos.find((info) => info.timeIdx === currentTimeIdx + 1 && info.company === companyName);

  // 정보가 없는 경우
  if (!nextInfo) {
    return ['🤔 다음엔 오를까요...?'];
  }

  // 주가 상승 예상
  if (nextInfo.price > 0) {
    return ['✨ 제 정보에 의하면...', '다음 주기에 주가가 오를 것 같아요!'];
  }

  // 주가 하락 예상
  if (nextInfo.price < 0) {
    return ['🧐 제 정보에 의하면...', '다음 주기에 주가가 떨어질 것 같아요!'];
  }

  return ['🤔 다음엔 오를까요...?'];
};

interface CalculateAveragePurchasePriceParams {
  logs: Array<{
    company: string;
    date: Date;
    price: number;
    quantity: number;
    action: string;
    round: number;
    status: StockTradeStatus;
  }>;
  company: string;
  currentQuantity: number;
  round?: number;
  prevData?: number;
}

export const calculateAveragePurchasePrice = (params: CalculateAveragePurchasePriceParams): number => {
  const { logs, company, currentQuantity, round, prevData = 0 } = params;

  if (round === undefined) {
    return 0;
  }

  const myCompanyTradeLog = logs?.filter(
    ({ company: c, round: r, status }) => c === company && r === round && status === STOCK_TRADE_STATUS.SUCCESS,
  );

  const buyCount = myCompanyTradeLog
    ?.filter((v) => v.action === TRADE.BUY)
    .reduce((acc, curr) => acc + curr.quantity, 0);
  const sellCount = myCompanyTradeLog
    ?.filter((v) => v.action === TRADE.SELL)
    .reduce((acc, curr) => acc + curr.quantity, 0);

  if (buyCount - sellCount !== currentQuantity) {
    return prevData;
  }

  const sortedTradeLog = myCompanyTradeLog?.sort((a, b) => a.date.getTime() - b.date.getTime());

  let count = 0;

  const 평균매입가격 = sortedTradeLog?.reduce((acc, curr) => {
    if (curr.action === TRADE.BUY) {
      count += curr.quantity;
      return acc + curr.price * curr.quantity;
    }
    if (curr.action === TRADE.SELL) {
      const currentCount = count;
      count -= curr.quantity;
      return acc - (acc / currentCount) * curr.quantity;
    }
    return acc;
  }, 0);

  return currentQuantity === 0 ? 0 : Math.round(평균매입가격 / currentQuantity);
};

export const renderStockChangesInfo = (
  selectedCompany: string,
  stock: GetStock,
  companiesPrice: Record<string, number>,
  timeIdx: number,
): { color: string; text: string } => {
  const currentPrice = companiesPrice[selectedCompany];
  const previousPrice = stock.companies[selectedCompany][timeIdx - 1]?.가격 || 0;

  if (previousPrice > 0) {
    const priceChange = currentPrice - previousPrice;
    const changePercent = Math.round((priceChange / previousPrice) * 100);

    if (changePercent === 0) {
      return {
        color: '#94A3B8',
        text: '0% 변동 없음',
      };
    }

    if (changePercent > 0) {
      return {
        color: '#F87171',
        text: `+${priceChange.toLocaleString()} (+${changePercent}%)`,
      };
    }

    return {
      color: '#60a5fa',
      text: `${priceChange.toLocaleString()} (${changePercent}%)`,
    };
  }

  return {
    color: '#94A3B8',
    text: '0% 변동 없음',
  };
};

export const getAnimalImageSource = (companyName: string): string => {
  // 입력된 회사 이름이 유효한 CompanyNames 타입인지 확인
  const isValidCompanyName = Object.keys(ANIMAL_NAME).some((v) => v === companyName);

  if (isValidCompanyName) {
    // 유효한 회사 이름이면 해당 동물 이미지 URL 반환
    return `/no_bg_animal/${ANIMAL_NAME[companyName]}.webp`;
  }
  // 유효하지 않은 회사 이름이면 기본값으로 햄찌금융 이미지 반환
  return `/no_bg_animal/${ANIMAL_NAME['햄찌금융']}.webp`;
};

export const secondsToMMSS = (seconds: number): string => {
  // 음수인 경우 처리
  if (seconds < 0) {
    return `-${secondsToMMSS(-seconds)}`;
  }

  // 분과 초 계산
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  // 두 자리 숫자로 포맷팅
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
};

export type CompanyName = string;

export interface StockValue {
  investmentPrice: number;
  stockCount: number;
  stockPrice: number;
  profitRate: number;
}

export const calculateCurrentPortfolio = ({
  stockStorages,
  companies,
  timeIdx,
}: {
  stockStorages: StockStorageSchema[];
  companies: Record<string, CompanyInfo[]>;
  timeIdx: number;
}): Record<CompanyName, StockValue> => {
  const portfolio: Record<CompanyName, StockValue> = {};

  stockStorages.forEach((storage) => {
    const { companyName, stockCountCurrent, stockAveragePrice } = storage;

    const stockCurrentPrice = companies[companyName][timeIdx].가격;
    const investmentPrice = Math.round(stockCountCurrent * stockAveragePrice);
    const stockPrice = Math.round(stockCountCurrent * stockCurrentPrice);
    const profitRate = formatPercentage((stockPrice - investmentPrice) / investmentPrice);

    portfolio[companyName] = {
      investmentPrice,
      profitRate,
      stockCount: stockCountCurrent,
      stockPrice,
    };
  });

  return portfolio;
};
