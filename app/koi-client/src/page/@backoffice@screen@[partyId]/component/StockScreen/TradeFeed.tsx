import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import { commaizeNumber } from '@toss/utils';
import { Trade } from '../../../../hook/useTradeDetection';

interface Props {
  trades: Trade[];
  maxItems?: number;
}

const TradeFeed = ({ trades, maxItems = 20 }: Props) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const toggleFeed = (event: KeyboardEvent) => {
      if (event.key === 'f') {
        setIsVisible((prev) => !prev);
      }
    };

    document.addEventListener('keydown', toggleFeed);
    return () => {
      document.removeEventListener('keydown', toggleFeed);
    };
  }, []);

  if (!isVisible) return null;

  const recentTrades = trades.slice(-maxItems).reverse();

  return (
    <FeedContainer>
      <FeedHeader>
        <Title>실시간 거래</Title>
        <Subtitle>최근 {maxItems}건</Subtitle>
      </FeedHeader>
      <FeedContent>
        {recentTrades.length === 0 ? (
          <EmptyMessage>거래 대기중...</EmptyMessage>
        ) : (
          recentTrades.map((trade) => (
            <TradeItem
              key={`${trade.timestamp}-${trade.userId}-${trade.company}`}
              type={trade.type}
              isNew={recentTrades[0] === trade}
            >
              <TradeIcon>{trade.type === 'BUY' ? '📈' : '📉'}</TradeIcon>
              <TradeInfo>
                <CompanyName>{trade.company}</CompanyName>
                <TradeDetails>
                  <TradeType type={trade.type}>{trade.type === 'BUY' ? '매수' : '매도'}</TradeType>
                  <Amount>{commaizeNumber(trade.amount)}주</Amount>
                </TradeDetails>
              </TradeInfo>
              <TimeAgo>{getTimeAgo(trade.timestamp)}</TimeAgo>
            </TradeItem>
          ))
        )}
      </FeedContent>
      <FeedFooter>
        <HintText>F키: 피드 토글</HintText>
      </FeedFooter>
    </FeedContainer>
  );
};

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return '방금';
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}분 전`;
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const newItemPulse = keyframes`
  0% {
    transform: scale(1);
    background-color: transparent;
  }
  50% {
    transform: scale(1.02);
    background-color: rgba(59, 130, 246, 0.1);
  }
  100% {
    transform: scale(1);
    background-color: transparent;
  }
`;

const FeedContainer = styled.div`
  position: fixed;
  right: 20px;
  top: 180px;
  width: 320px;
  max-height: 600px;
  background: rgba(37, 40, 54, 0.95);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 100;
  animation: ${slideIn} 0.3s ease-out;
`;

const FeedHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h3`
  color: white;
  font-size: 18px;
  margin: 0;
  font-weight: 600;
`;

const Subtitle = styled.p`
  color: #9ca3af;
  font-size: 12px;
  margin: 4px 0 0 0;
`;

const FeedContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const EmptyMessage = styled.div`
  color: #6b7280;
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
`;

const TradeItem = styled.div<{ type: 'BUY' | 'SELL'; isNew: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 4px 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid;
  border-left-color: ${(props) => (props.type === 'BUY' ? '#22c55e' : '#ef4444')};
  transition: all 0.2s ease;

  ${(props) =>
    props.isNew &&
    css`
      animation: ${newItemPulse} 0.6s ease-out;
    `}

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(-2px);
  }
`;

const TradeIcon = styled.span`
  font-size: 20px;
  margin-right: 12px;
`;

const TradeInfo = styled.div`
  flex: 1;
`;

const CompanyName = styled.div`
  color: white;
  font-size: 14px;
  font-weight: 500;
`;

const TradeDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`;

const TradeType = styled.span<{ type: 'BUY' | 'SELL' }>`
  color: ${(props) => (props.type === 'BUY' ? '#22c55e' : '#ef4444')};
  font-size: 12px;
  font-weight: 600;
`;

const Amount = styled.span`
  color: #9ca3af;
  font-size: 12px;
`;

const TimeAgo = styled.div`
  color: #6b7280;
  font-size: 11px;
  white-space: nowrap;
`;

const FeedFooter = styled.div`
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const HintText = styled.span`
  color: #6b7280;
  font-size: 11px;
`;

export default TradeFeed;
