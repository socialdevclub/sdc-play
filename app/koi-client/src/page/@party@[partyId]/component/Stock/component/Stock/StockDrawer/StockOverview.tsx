import React, { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import styled from '@emotion/styled';
import AnimatedInfoHeader from '../../../../../../../component-presentation/AnimatedInfoHeader';
import MessageBalloon from '../../../../../../../component-presentation/MessageBalloon';
import StockLineChart from '../../../../../../../component-presentation/StockLineChart';
import StockBuyingNotification from '../StockBuyingNotification';
import Spinner from '../../../../../../../component-presentation/Spinner';
import { Query } from '../../../../../../../hook';
import { calculateProfitRate, getAnimalImageSource, renderStockChangesInfo } from '../../../../../../../utils/stock';
import { UserStore } from '../../../../../../../store';
import { BEARISH_COLOR, BULLISH_COLOR } from '../../../color';
import { useTradeStock } from '../../../../../hook/useTradeStock';

interface StockOverviewProps {
  stockId: string;
  selectedCompany: string;
  stockMessages: string[];
  currentStockCount: number;
  priceData: Record<string, number[]>;
  remainingStock: number;
  maxBuyableCountWithLimit: number;
  isDisabled: boolean;
  isCanBuy: boolean;
  보유주식: {
    company: string;
    count: number;
  }[];
}

const StockOverview: React.FC<StockOverviewProps> = ({
  stockId,
  selectedCompany,
  stockMessages,
  currentStockCount,
  priceData,
  remainingStock,
  maxBuyableCountWithLimit,
  isDisabled: isDisabledOverview,
  isCanBuy,
  보유주식,
}) => {
  const { data: stock, companiesPrice, timeIdx, refetch: refetchStock } = Query.Stock.useQueryStock(stockId);
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

  const { refetch: refetchUser, user } = Query.Stock.useUser({
    stockId,
    userId,
    userRefetchInterval: 500,
  });

  const { onClickSell, onClickBuy } = useTradeStock({
    refetchUser,
  });

  const [loadingButton, setLoadingButton] = useState<'sell' | 'buy' | 'sellAll' | null>(null);

  useEffect(() => {
    // 주가 변동 반영
    refetchStock();
  }, [refetchStock]);

  const chartPriceData = useMemo(
    () => (selectedCompany ? priceData[selectedCompany].slice(0, (timeIdx ?? 0) + 1) : [100000]),
    [priceData, selectedCompany, timeIdx],
  );

  const currentStockStorage = useMemo(
    () => user?.stockStorages.find(({ companyName }) => companyName === selectedCompany),
    [selectedCompany, user?.stockStorages],
  );

  const averagePurchasePrice = useMemo(
    () => currentStockStorage?.stockAveragePrice ?? 0,
    [currentStockStorage?.stockAveragePrice],
  );

  const stockProfitRate = useMemo(
    () =>
      selectedCompany && 보유주식.find(({ company }) => company === selectedCompany)
        ? calculateProfitRate(companiesPrice[selectedCompany], averagePurchasePrice)
        : null,
    [averagePurchasePrice, companiesPrice, selectedCompany, 보유주식],
  );

  const isDisabled = isDisabledOverview || loadingButton !== null;

  if (!stock || !userId) {
    return <></>;
  }

  return (
    <>
      {selectedCompany && (
        <AnimatedInfoHeader
          title={selectedCompany}
          subtitle={`보유 주식: ${currentStockCount}`}
          subTitleColor="#d1d5db"
          value={selectedCompany ? companiesPrice[selectedCompany] : 0}
          valueFormatted={`${selectedCompany ? companiesPrice[selectedCompany].toLocaleString() : 0}원`}
          valueColor="white"
          badge={renderStockChangesInfo(selectedCompany, stock, companiesPrice, timeIdx ?? 0)}
          src={getAnimalImageSource(selectedCompany)}
          width={50}
          currentStockCount={currentStockCount}
        />
      )}

      <MessageBalloon messages={stockMessages} />
      <StockLineChart
        company={selectedCompany}
        priceData={chartPriceData}
        fluctuationsInterval={stock.fluctuationsInterval}
        averagePurchasePrice={averagePurchasePrice}
      />
      <StockBuyingNotification
        stockProfitRate={stockProfitRate}
        remainingStock={remainingStock}
        maxBuyableCountWithLimit={maxBuyableCountWithLimit}
      />
      <ButtonContainer padding="0 16px 12px 16px">
        <ButtonRow>
          <TradeButton
            backgroundColor={BEARISH_COLOR}
            disabled={isDisabled || !보유주식.find(({ company }) => company === selectedCompany)?.count}
            onClick={async () => {
              setLoadingButton('sell');
              const startTime = Date.now();

              await onClickSell({
                amount: 1,
                callback: () => refetchUser(),
                company: selectedCompany,
                round: stock.round,
                stockId,
                unitPrice: companiesPrice[selectedCompany],
                userId,
              });

              const elapsed = Date.now() - startTime;
              if (elapsed < 500) {
                await new Promise<void>((resolve) => {
                  setTimeout(() => resolve(), 500 - elapsed);
                });
              }

              setLoadingButton(null);
            }}
          >
            {loadingButton === 'sell' ? <Spinner size={20} color="white" /> : '판매하기'}
          </TradeButton>
          <TradeButton
            backgroundColor={BULLISH_COLOR}
            disabled={isDisabled || !isCanBuy || maxBuyableCountWithLimit === 0}
            onClick={async () => {
              setLoadingButton('buy');
              const startTime = Date.now();

              await onClickBuy({
                amount: 1,
                callback: () => refetchUser(),
                company: selectedCompany,
                round: stock.round,
                stockId,
                unitPrice: companiesPrice[selectedCompany],
                userId,
              });

              const elapsed = Date.now() - startTime;
              if (elapsed < 500) {
                await new Promise<void>((resolve) => {
                  setTimeout(() => resolve(), 500 - elapsed);
                });
              }

              setLoadingButton(null);
            }}
          >
            {loadingButton === 'buy' ? <Spinner size={20} color="white" /> : '구매하기'}
          </TradeButton>
        </ButtonRow>
      </ButtonContainer>
      <ButtonContainer padding="0 16px 12px 16px">
        <TradeButton
          backgroundColor="#374151"
          disabled={isDisabled || !보유주식.find(({ company }) => company === selectedCompany)?.count}
          onClick={async () => {
            setLoadingButton('sellAll');
            const startTime = Date.now();

            await onClickSell({
              amount: 보유주식.find(({ company }) => company === selectedCompany)?.count ?? 0,
              callback: () => refetchUser(),
              company: selectedCompany,
              round: stock.round,
              stockId,
              unitPrice: companiesPrice[selectedCompany],
              userId,
            });

            const elapsed = Date.now() - startTime;
            if (elapsed < 500) {
              await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 500 - elapsed);
              });
            }

            setLoadingButton(null);
          }}
        >
          {loadingButton === 'sellAll' ? <Spinner size={20} color="white" /> : '모두 팔기'}
        </TradeButton>
      </ButtonContainer>
    </>
  );
};

export default StockOverview;

const ButtonContainer = styled.div<{ padding: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.padding};
`;

const ButtonRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const TradeButton = styled.button<{ backgroundColor: string }>`
  width: 100%;
  height: 48px;
  background-color: ${(props) => props.backgroundColor};
  color: white;
  border-radius: 4px;
  border: none;
  font-family: DungGeunMo;
  font-size: 14px;
  line-height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
