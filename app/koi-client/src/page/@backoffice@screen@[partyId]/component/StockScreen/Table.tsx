import { StockConfig } from 'shared~config';
import React, { CSSProperties, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { commaizeNumber } from '@toss/utils';
import { css, keyframes } from '@emotion/react';
import { Query } from '../../../../hook';
import { useTradeDetection } from '../../../../hook/useTradeDetection';

interface Props {
  stockId: string;
}

const Table = ({ stockId }: Props) => {
  const { data: stock, timeIdx } = Query.Stock.useQueryStock(stockId, { keepPreviousData: false });
  const { getRecentTradeByCompany, getTradingActivity } = useTradeDetection(stockId);

  const [isShowRemainingStock, setIsShowRemainingStock] = useState(false);

  useEffect(() => {
    const toggleRemainingStock = (event: KeyboardEvent) => {
      if (event.key === 'r') {
        setIsShowRemainingStock((prev) => !prev);
      }
    };

    document.addEventListener('keydown', toggleRemainingStock);

    return () => {
      document.removeEventListener('keydown', toggleRemainingStock);
    };
  }, []);

  if (!stock?.companies || timeIdx === undefined) {
    return <></>;
  }

  const { companies } = stock;
  const companyNames = Object.keys(companies) as StockConfig.CompanyNames[];

  return (
    <Wrapper>
      <Row>
        <RowHeaderItem>주식이름</RowHeaderItem>
        <RowHeaderItem>현재 가격</RowHeaderItem>
        <RowHeaderItem>변동 정보</RowHeaderItem>
        {isShowRemainingStock && <RowHeaderItem>남은 수량</RowHeaderItem>}
      </Row>
      <Row>
        <RowHeaderItem>주식이름</RowHeaderItem>
        <RowHeaderItem>현재 가격</RowHeaderItem>
        <RowHeaderItem>변동 정보</RowHeaderItem>
        {isShowRemainingStock && <RowHeaderItem>남은 수량</RowHeaderItem>}
      </Row>
      {companyNames.map((company) => {
        if (timeIdx > 9) {
          return <></>;
        }

        const remainingStock = stock.remainingStocks[company];
        const diff = timeIdx === 0 ? 0 : companies[company][timeIdx].가격 - companies[company][timeIdx - 1].가격;
        const 등락 =
          diff > 0 ? `▲${commaizeNumber(Math.abs(diff))}` : diff < 0 ? `▼${commaizeNumber(Math.abs(diff))}` : '-';
        const color = diff > 0 ? '#F87171' : diff < 0 ? '#60A5FA' : undefined;

        const recentTrade = getRecentTradeByCompany(company);
        const activity = getTradingActivity(company);
        const isRecentTrade = recentTrade && Date.now() - recentTrade.timestamp < 1000;

        return (
          <StockRow key={company} tradeType={isRecentTrade ? recentTrade.type : undefined} activity={activity}>
            <RowItem>{company}</RowItem>
            <RowItem>{commaizeNumber(companies[company][timeIdx].가격)}</RowItem>
            <RowItem color={color}>{등락}</RowItem>
            {isShowRemainingStock && (
              <RowItem
                style={{
                  width: '10px',
                }}
              >
                {remainingStock}
              </RowItem>
            )}
          </StockRow>
        );
      })}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
`;

// 애니메이션 정의
const pulseGreen = keyframes`
  0% {
    background-color: transparent;
    transform: scale(1);
  }
  50% {
    background-color: rgba(34, 197, 94, 0.3);
    transform: scale(1.02);
  }
  100% {
    background-color: transparent;
    transform: scale(1);
  }
`;

const pulseRed = keyframes`
  0% {
    background-color: transparent;
    transform: scale(1);
  }
  50% {
    background-color: rgba(239, 68, 68, 0.3);
    transform: scale(1.02);
  }
  100% {
    background-color: transparent;
    transform: scale(1);
  }
`;

const fireEffect = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 rgba(248, 113, 113, 0);
  }
  50% {
    transform: scale(1.01);
    opacity: 0.9;
    box-shadow: 0 0 20px rgba(248, 113, 113, 0.4);
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
  width: 50%;
  font-size: 28px;
  color: white;
`;

const StockRow = styled(Row)<{
  tradeType?: 'BUY' | 'SELL';
  activity?: string;
}>`
  position: relative;
  transition: all 0.3s ease;
  border-radius: 4px;
  margin: 2px 0;

  ${(props) =>
    props.tradeType === 'BUY' &&
    css`
      animation: ${pulseGreen} 0.6s ease-out;
    `}

  ${(props) =>
    props.tradeType === 'SELL' &&
    css`
      animation: ${pulseRed} 0.6s ease-out;
    `}

  ${(props) =>
    props.activity === 'hot' &&
    css`
      background: linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.15), transparent);
      animation: ${fireEffect} 1.5s infinite;

      &::before {
        content: '🔥';
        position: absolute;
        left: -30px;
        font-size: 20px;
        animation: ${fireEffect} 1s infinite alternate;
      }
    `}

  ${(props) =>
    props.activity === 'warm' &&
    css`
      background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.1), transparent);
    `}

  ${(props) =>
    props.activity === 'active' &&
    css`
      background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.05), transparent);
    `}
`;

const RowItem = styled.div<{ color?: CSSProperties['color'] }>`
  flex: 1;
  ${({ color }) => css`
    color: ${color};
  `};
  display: flex;
  justify-content: center;
`;

const RowHeaderItem = styled.div`
  flex: 1;
  color: rgb(202, 202, 202);
  display: flex;
  font-size: 20px;
  justify-content: center;
  text-decoration: underline;
  text-underline-offset: 6px;
  text-decoration-thickness: 1px;
`;

export default Table;
