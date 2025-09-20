import styled from '@emotion/styled';
import { Tooltip } from 'antd';
import { renderProfitBadge } from '../../utils/renderProfitBadge';

interface Props {
  stockProfitRate: number | null;
  remainingStock: number;
  maxBuyableCountWithLimit: number;
}

const StockBuyingNotification = ({ stockProfitRate, remainingStock, maxBuyableCountWithLimit }: Props) => {
  const maxPurchasableCount = Math.min(maxBuyableCountWithLimit, remainingStock);
  const badge = renderProfitBadge(stockProfitRate);

  return (
    <Container>
      <BadgeContainer backgroundColor={badge.backgroundColor} color={badge.color}>
        {badge.text}
      </BadgeContainer>

      <Tooltip
        title={
          <TooltipContent>
            <div>보유가능개수: {maxBuyableCountWithLimit}주</div>
            {remainingStock !== Infinity && <div>남은주식개수: {remainingStock}주</div>}
          </TooltipContent>
        }
        color="#111827"
        overlayInnerStyle={{ borderRadius: '6px', padding: '8px 12px' }}
      >
        <MaxPurchasableCount>{`구매가능수량: ${maxPurchasableCount || 0}`}</MaxPurchasableCount>
      </Tooltip>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 20px 18px;
`;

const BadgeContainer = styled.div<{ backgroundColor: string; color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ backgroundColor }) => backgroundColor};
  color: ${({ color }) => color};
  border-radius: 14px;
  padding: 0 10px;
  font-size: 14px;
  height: 30px;
`;

const TooltipContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #111827;
  gap: 4px;
  font-size: 12px;
`;

const MaxPurchasableCount = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 182, 67, 0.19);
  color: #ffb643;
  border-radius: 14px;
  height: 30px;
  padding: 0 10px;
  font-size: 14px;
`;

export default StockBuyingNotification;
