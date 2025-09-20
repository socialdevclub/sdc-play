import React, { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import InfoHeader from '../../../../../../../component-presentation/InfoHeader';
import MessageBalloon from '../../../../../../../component-presentation/MessageBalloon';
import StockLineChart from '../../../../../../../component-presentation/StockLineChart';
import StockBuyingNotification from '../StockBuyingNotification';
import ButtonGroup from '../../../../../../../component-presentation/ButtonGroup';
import { Query } from '../../../../../../../hook';
import { calculateProfitRate, getAnimalImageSource, renderStockChangesInfo } from '../../../../../../../utils/stock';
import { UserStore } from '../../../../../../../store';
import { StockDrawerState } from '.';
import { BEARISH_COLOR, BULLISH_COLOR } from '../../../color';

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
  setDrawerState: (state: StockDrawerState) => void;
}

const StockOverview: React.FC<StockOverviewProps> = ({
  stockId,
  selectedCompany,
  stockMessages,
  currentStockCount,
  priceData,
  remainingStock,
  maxBuyableCountWithLimit,
  isDisabled,
  isCanBuy,
  보유주식,
  setDrawerState,
}) => {
  const {
    data: stock,
    companiesPrice,
    timeIdx,
  } = Query.Stock.useQueryStock(stockId, {
    refetchInterval: Number.POSITIVE_INFINITY,
  });
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

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

  if (!stock) {
    return <></>;
  }

  return (
    <>
      {selectedCompany && (
        <InfoHeader
          title={selectedCompany}
          subtitle={`보유 주식: ${currentStockCount}`}
          subTitleColor="#d1d5db"
          value={selectedCompany ? companiesPrice[selectedCompany] : 0}
          valueFormatted={`${selectedCompany ? companiesPrice[selectedCompany].toLocaleString() : 0}원`}
          valueColor="white"
          badge={renderStockChangesInfo(selectedCompany, stock, companiesPrice, timeIdx ?? 0)}
          src={getAnimalImageSource(selectedCompany)}
          width={50}
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
      <ButtonGroup
        buttons={[
          {
            backgroundColor: BEARISH_COLOR,
            disabled: isDisabled || !보유주식.find(({ company }) => company === selectedCompany)?.count,
            flex: 1,
            onClick: () => {
              setDrawerState('SELL');
              //   onClickSell({
              //     amount: 1,
              //     callback: () => refetchUser(),
              //     company: selectedCompany,
              //     round: stock.round,
              //     stockId,
              //     unitPrice: companiesPrice[selectedCompany],
              //     userId,
              //   });
            },
            text: '판매하기',
          },
          {
            backgroundColor: BULLISH_COLOR,
            disabled: isDisabled || !isCanBuy || maxBuyableCountWithLimit === 0,
            flex: 1,
            onClick: () => {
              setDrawerState('BUY');
              //   onClickBuy({
              //     amount: 1,
              //     callback: () => refetchUser(),
              //     company: selectedCompany,
              //     round: stock.round,
              //     stockId,
              //     unitPrice: companiesPrice[selectedCompany],
              //     userId,
              //   });
            },
            text: '구매하기',
          },
        ]}
        direction="row"
        padding="0 16px 12px 16px"
      />
      {/* <ButtonGroup
        buttons={[
          {
            backgroundColor: '#374151',
            disabled: isDisabled || !보유주식.find(({ company }) => company === selectedCompany)?.count,
            onClick: () =>
              onClickSell({
                amount: 보유주식.find(({ company }) => company === selectedCompany)?.count ?? 0,
                callback: () => refetchUser(),
                company: selectedCompany,
                round: stock.round,
                stockId,
                unitPrice: companiesPrice[selectedCompany],
                userId,
              }),
            text: '모두 팔기',
          },
        ]}
        padding="0 16px 12px 16px"
      /> */}
    </>
  );
};

export default StockOverview;
