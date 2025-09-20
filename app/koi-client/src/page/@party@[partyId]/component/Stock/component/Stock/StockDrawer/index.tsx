import { Drawer } from 'antd';
import { useMediaQuery } from 'react-responsive';
import { useAtomValue } from 'jotai';
import { MessageInstance } from 'antd/es/message/interface';
import { StockConfig } from 'shared~config';
import { useEffect, useMemo, useState } from 'react';
import { MEDIA_QUERY } from '../../../../../../../config/common';
import { Query } from '../../../../../../../hook';
import { UserStore } from '../../../../../../../store';
import { useTradeStock } from '../../../../../hook/useTradeStock';
import StockOverview from './StockOverview';
import StockTransaction from './StockTransaction';

export type StockDrawerState = 'OVERVIEW' | 'BUY' | 'SELL';

interface Props {
  drawerOpen: boolean;
  handleCloseDrawer: () => void;
  selectedCompany: string;
  stockMessages: string[];
  priceData: Record<string, number[]>;
  stockId: string;
  messageApi: MessageInstance;
}

const StockDrawer = ({
  drawerOpen,
  handleCloseDrawer,
  selectedCompany,
  stockMessages,
  priceData,
  stockId,
  messageApi,
}: Props) => {
  const isDesktop = useMediaQuery({ query: MEDIA_QUERY.DESKTOP });
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

  const [drawerState, setDrawerState] = useState<StockDrawerState>('OVERVIEW');

  useEffect(() => {
    if (!selectedCompany) {
      setDrawerState('OVERVIEW');
    }
  }, [selectedCompany]);

  const {
    refetch: refetchUser,
    isFreezed,
    user,
    getStockStorage,
  } = Query.Stock.useUser({
    stockId,
    userId,
    userRefetchInterval: 500,
  });
  const {
    data: stock,
    companiesPrice,
    timeIdx,
  } = Query.Stock.useQueryStock(stockId, {
    refetchInterval: Number.POSITIVE_INFINITY,
  });
  const { isBuyLoading, isSellLoading, onClickBuy, onClickSell } = useTradeStock({ messageApi, refetchUser });

  const 보유주식 = useMemo(() => {
    return (
      user?.stockStorages
        .filter(({ stockCountCurrent }) => stockCountCurrent > 0)
        .map(({ companyName, stockCountCurrent }) => ({
          company: companyName,
          count: stockCountCurrent,
        })) ?? []
    );
  }, [user?.stockStorages]);

  if (!stock || !userId || !user) {
    return <>불러오는 중</>;
  }

  const isLoading = isBuyLoading || isFreezed || isSellLoading;
  const isDisabled = timeIdx === undefined || timeIdx >= StockConfig.MAX_STOCK_IDX || !stock.isTransaction || isLoading;

  // Todo:: 선택한 회사가 없을 때도 계속 계산하고 있으므로 컴포넌트를 분리하는게 좋을 것 같습니다.
  // 또한 변수가 많아 가시성이 떨어짐
  const remainingStock = stock.remainingStocks[selectedCompany]; // 선택한 주식의 남은 개수
  const maxBuyableCount = Math.floor(user.money / companiesPrice[selectedCompany]); // 내가 가진 돈으로 선택한 주식을 얼마나 살 수 있는가
  const isBuyable = user.money >= companiesPrice[selectedCompany];
  const isRemainingStock = Boolean(remainingStock);
  const isCanBuy = isBuyable && isRemainingStock;

  // 주식 구매 한도 계산
  const currentStockCount = getStockStorage(selectedCompany)?.stockCountCurrent ?? 0; // 내가 보유한 해당 주식의 개수
  const maxStockLimitByPlayer = Math.max(0, stock.maxPersonalStockCount - currentStockCount); // 플레이어 수 제한에 따른 최대 구매 가능 개수

  // 최종 구매 가능 개수 계산 (돈, 남은 주식, 플레이어 수 제한 고려)
  const maxBuyableCountWithLimit = Math.min(maxBuyableCount, remainingStock ?? 0, maxStockLimitByPlayer);

  // TODO :: timeIdx (현재 라운드 정보) 타입가드 엄격한 처리 필요 (임시로 땜빵 타입가드 설정함)
  // if (!timeIdx) {
  //   return <div>로딩중입니다...</div>;
  // }

  return (
    <Drawer
      placement="bottom"
      onClose={handleCloseDrawer}
      open={drawerOpen}
      height="auto"
      closeIcon={false}
      afterOpenChange={(visible) => {
        if (visible) {
          const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 300);
          return () => clearTimeout(timer);
        }
        return () => {};
      }}
      styles={{
        body: {
          padding: '28px 0 0 0',
        },
        content: {
          backgroundColor: '#252836',
          borderRadius: '16px 16px 0 0',
          margin: '0 auto',
          maxWidth: isDesktop ? '400px' : '100%',
        },
        header: {
          padding: '0',
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      {(() => {
        switch (drawerState) {
          case 'OVERVIEW':
            return (
              <StockOverview
                stockId={stockId}
                selectedCompany={selectedCompany}
                stockMessages={stockMessages}
                currentStockCount={currentStockCount}
                priceData={priceData}
                remainingStock={remainingStock}
                maxBuyableCountWithLimit={maxBuyableCountWithLimit}
                isDisabled={isDisabled}
                isCanBuy={isCanBuy}
                setDrawerState={setDrawerState}
                보유주식={보유주식}
              />
            );
          default:
            return (
              <StockTransaction
                type={drawerState}
                perPrice={companiesPrice[selectedCompany]}
                maxBuyableCountWithLimit={maxBuyableCountWithLimit}
                maxSellableCount={보유주식.find(({ company }) => company === selectedCompany)?.count ?? 0}
                selectedCompany={selectedCompany}
                stockId={stockId}
                userId={userId}
                onClickBuy={onClickBuy}
                onClickSell={onClickSell}
                handleCloseDrawer={handleCloseDrawer}
              />
            );
        }
      })()}
    </Drawer>
  );
};

export default StockDrawer;
