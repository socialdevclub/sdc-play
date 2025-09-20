import { styled } from '@linaria/react';
import { css } from '@linaria/core';
import React, { useState } from 'react';
import { useTradeStock } from '../../../../../hook/useTradeStock';
import { Query } from '../../../../../../../hook';
import { BEARISH_COLOR, BULLISH_COLOR } from '../../../color';

type StockTransactionProps = {
  type: 'BUY' | 'SELL';
  selectedCompany: string;
  stockId: string;
  userId: string;
  perPrice: number;
  maxSellableCount: number;
  maxBuyableCountWithLimit: number;
  onClickBuy: ReturnType<typeof useTradeStock>['onClickBuy'];
  onClickSell: ReturnType<typeof useTradeStock>['onClickSell'];
  handleCloseDrawer: () => void;
};

const StockTransaction: React.FC<StockTransactionProps> = ({
  type,
  perPrice,
  maxSellableCount,
  maxBuyableCountWithLimit,
  onClickBuy,
  onClickSell,
  selectedCompany,
  stockId,
  userId,
  handleCloseDrawer,
}) => {
  const { data: stock } = Query.Stock.useQueryStock(stockId, {
    refetchInterval: 30_000,
  });

  const [quantity, setQuantity] = useState('');

  const handleNumpadClick = (value: string) => {
    if (value === 'backspace') {
      setQuantity((prev) => prev.slice(0, -1));
      return;
    }
    if ((value === '0' || value === '00') && quantity.length === 0) {
      return;
    }

    if (type === 'BUY') {
      setQuantity((prev) => `${Math.min(Number(prev + value), maxBuyableCountWithLimit ?? 0)}`);
    } else if (type === 'SELL') {
      setQuantity((prev) => `${Math.min(Number(prev + value), maxSellableCount ?? 0)}`);
    }
  };

  const isBuy = type === 'BUY';
  const title = isBuy ? '몇 주 구매할까요?' : '몇 주 판매할까요?';
  const buttonText = isBuy ? '구매하기' : '판매하기';

  const onClickPercentageButton = (percentage: number) => {
    if (type === 'BUY') {
      const maxBuyableCount = maxBuyableCountWithLimit ?? 0;
      const percent = Math.floor(maxBuyableCount * percentage);
      const newQuantity = Math.min(Number(quantity) + percent, maxBuyableCount);
      setQuantity(`${newQuantity}`);
    } else if (type === 'SELL') {
      const percent = Math.floor(maxSellableCount * percentage);
      const newQuantity = Math.min(Number(quantity) + percent, maxSellableCount);
      setQuantity(`${newQuantity}`);
    }
  };

  if (!stock) {
    return <></>;
  }

  const onClickActionButton = () => {
    if (Number(quantity) === 0) {
      return;
    }

    if (type === 'BUY') {
      onClickBuy({
        amount: Number(quantity),
        company: selectedCompany,
        round: stock.round,
        stockId,
        unitPrice: perPrice,
        userId,
      });
    } else if (type === 'SELL') {
      onClickSell({
        amount: Number(quantity),
        company: selectedCompany,
        round: stock.round,
        stockId,
        unitPrice: perPrice,
        userId,
      });
    }

    handleCloseDrawer();
  };

  if (!perPrice) {
    return <></>;
  }

  return (
    <Container>
      {/* <Section>
        <Info>
          <Label>구매할 가격</Label>
          <Price>{perPrice.toLocaleString()}원</Price>
        </Info>
      </Section> */}

      <Section>
        <Info>
          <Label>수량</Label>
          <QuantityInput $hasValue={!!quantity}>
            {quantity ? (
              <>
                {Number(quantity).toLocaleString()}
                <span className={cursor} />주
              </>
            ) : (
              <>
                <span className={cursor} />
                {title}
              </>
            )}
          </QuantityInput>
          <SubInfo>
            {type === 'BUY' ? (
              // 구매
              quantity ? (
                <span>
                  총 {(perPrice * Number(quantity)).toLocaleString()}원 • 최대 {maxBuyableCountWithLimit}주
                </span>
              ) : (
                <span>
                  구매가능 {(perPrice * (maxBuyableCountWithLimit ?? 0)).toLocaleString()}원 • 최대{' '}
                  {maxBuyableCountWithLimit}주
                </span>
              )
            ) : // 판매
            quantity ? (
              <span>
                총 {(perPrice * Number(quantity)).toLocaleString()}원 • 최대 {maxSellableCount}주
              </span>
            ) : (
              <span>
                판매가능 {(perPrice * (maxSellableCount ?? 0)).toLocaleString()}원 • 최대 {maxSellableCount}주
              </span>
            )}
          </SubInfo>
        </Info>
      </Section>

      <ButtonGrid>
        <PercentageButton onClick={() => onClickPercentageButton(0.1)}>10%</PercentageButton>
        <PercentageButton onClick={() => onClickPercentageButton(0.25)}>25%</PercentageButton>
        <PercentageButton onClick={() => onClickPercentageButton(0.5)}>50%</PercentageButton>
        <PercentageButton onClick={() => onClickPercentageButton(1)}>최대</PercentageButton>
      </ButtonGrid>

      <NumpadGrid>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0, 'backspace'].map((item) => (
          <NumpadButton key={item} onClick={() => handleNumpadClick(String(item))}>
            {item === 'backspace' ? '←' : item}
          </NumpadButton>
        ))}
      </NumpadGrid>

      <Footer>
        <ActionButton
          style={{ backgroundColor: type === 'BUY' ? BULLISH_COLOR : BEARISH_COLOR }}
          onClick={onClickActionButton}
        >
          {buttonText}
        </ActionButton>
      </Footer>
    </Container>
  );
};

const Container = styled.div`
  color: white;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  padding-top: 0;
  font-family: 'Pretendard', sans-serif;
`;

const Section = styled.div`
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.span`
  font-size: 0.9rem;
  color: #8e8e93;
`;

const QuantityInput = styled.div<{ $hasValue: boolean }>`
  font-size: 2rem;
  font-weight: bold;
  margin-top: 0.5rem;
  color: ${(props) => (props.$hasValue ? 'white' : '#8e8e93')};
  min-height: 2.5rem;
  display: flex;
  align-items: center;
`;

const cursor = css`
  display: inline-block;
  width: 2px;
  height: 2rem;
  background-color: #3478f6;
  animation: blink 1s step-end infinite;

  @keyframes blink {
    from,
    to {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
`;

const SubInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #8e8e93;
  margin-top: 0.5rem;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const PercentageButton = styled.button`
  background-color: initial;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 0.7rem 0;
  font-size: 0.9rem;
  cursor: pointer;
`;

const NumpadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem 0.5rem;
  flex-grow: 1;
  place-items: center;
`;

const NumpadButton = styled.button`
  width: 100%;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  font-weight: 300;
  cursor: pointer;
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
`;

const ActionButton = styled.button`
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1rem 0;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
`;

export default StockTransaction;
