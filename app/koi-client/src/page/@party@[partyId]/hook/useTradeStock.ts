import { MessageInstance } from 'antd/es/message/interface';
import { Query } from '../../../hook';

interface Props {
  messageApi: MessageInstance;
  refetchUser: () => void;
}

interface ReturnType {
  onClickBuy: (props: BuyStockProps) => Promise<void>;
  onClickSell: (props: SellStockProps) => Promise<void>;
  isBuyLoading: boolean;
  isSellLoading: boolean;
}

interface BuyStockProps {
  amount: number;
  company: string;
  round: number;
  stockId: string;
  unitPrice: number;
  userId: string;
  callback?: () => void;
}

interface SellStockProps {
  amount: number;
  company: string;
  round: number;
  stockId: string;
  unitPrice: number;
  userId: string;
  callback?: () => void;
}

/**
 * 주식 거래 (구매, 판매) 로직을 담당하고,
 * 서버에서 성공/실패를 확인하기 어려운 비동기 메시지 큐로 인해 구매/판매 토스트 메시지 표시를 위한 커스텀 훅
 * @param stockStorages 현재 내가 가진 주식들에 대한 정보
 * @param messageApi 메시지 API
 */
export const useTradeStock = ({ messageApi, refetchUser }: Props): ReturnType => {
  const { mutateAsync: buyStock, isLoading: isBuyLoading } = Query.Stock.useBuyStock();
  const { mutateAsync: sellStock, isLoading: isSellLoading } = Query.Stock.useSellStock();

  const onClickBuy = async ({
    amount,
    company,
    round,
    stockId,
    unitPrice,
    userId,
    callback,
  }: BuyStockProps): Promise<void> => {
    const { status, message } = await buyStock({ amount, company, round, stockId, unitPrice, userId });
    refetchUser();

    const isSuccess = status === 200;
    const isFailed = status >= 400;

    if (isSuccess) {
      messageApi.destroy();
      messageApi.open({ content: message, duration: 2, type: 'success' });
      callback?.();
    }

    if (isFailed) {
      messageApi.destroy();
      messageApi.open({ content: message, duration: 2, type: 'error' });
    }
  };

  const onClickSell = async ({
    amount,
    company,
    round,
    stockId,
    unitPrice,
    userId,
    callback,
  }: SellStockProps): Promise<void> => {
    const { status, message } = await sellStock({ amount, company, round, stockId, unitPrice, userId });
    refetchUser();

    const isSuccess = status === 200;
    const isFailed = status >= 400;

    if (isSuccess) {
      messageApi.destroy();
      messageApi.open({ content: message, duration: 2, type: 'success' });
      callback?.();
    }

    if (isFailed) {
      messageApi.destroy();
      messageApi.open({ content: message, duration: 2, type: 'error' });
    }
  };

  return { isBuyLoading, isSellLoading, onClickBuy, onClickSell };
};
