import styled from '@emotion/styled';
import { getAnimalImageSource } from '../../../../../utils/stock.ts';

interface StockCardProps {
  companyName: string;
  stockCount: number;
  onClick?: (company: string) => void;
  totalValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  investmentRatio: string;
}

const StockInfoCard = ({
  companyName,
  stockCount,
  onClick,
  totalValue,
  profitLoss,
  profitLossPercentage,
  investmentRatio,
}: StockCardProps) => {
  return (
    <ButtonContainer onClick={() => onClick?.(companyName)}>
      <Image src={getAnimalImageSource(companyName)} alt={companyName} />
      <FlexRowBetween>
        <FlexCol>
          <Company>{companyName}</Company>
          <OwnStock>
            {stockCount}주 / {investmentRatio}
          </OwnStock>
        </FlexCol>
        <PriceWrapper>
          <Price>{totalValue.toLocaleString('ko-KR')}원</Price>
          <FlexRowCenter>
            {profitLoss >= 0 ? (
              <PriceTrendRed>
                {`+${profitLoss.toLocaleString('ko-KR')}`} ({`+${profitLossPercentage}%`})
              </PriceTrendRed>
            ) : (
              <PriceTrendBlue>
                {profitLoss.toLocaleString('ko-KR')} ({`${profitLossPercentage}%`})
              </PriceTrendBlue>
            )}
          </FlexRowCenter>
        </PriceWrapper>
      </FlexRowBetween>
    </ButtonContainer>
  );
};

// const Skeleton = styled.div`
//   width: 50px;
//   height: 50px;
//   border-radius: 6px;
//   background-color: black;
// `;

const ButtonContainer = styled.div`
  width: 100%;
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #252836;
  box-sizing: border-box;
  padding: 10px 12px;
  overflow: hidden;
  border-radius: 6px;
`;

const OwnStock = styled.div`
  font-size: 14px;
  line-height: 22px;
  font-weight: 500;
  //margin-bottom: 6px;
  color: #d1d5db;
  //line-height: 22px;
`;

const Company = styled.div`
  font-size: 18px;
  line-height: 22px;
  font-weight: 400;
  color: white;
`;

const FlexRowBetween = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-left: 16px;
`;

const FlexRowCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const FlexCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
`;

const PriceWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
`;

const Price = styled.div`
  font-size: 18px;
  line-height: 22px;
  font-weight: 400;
  color: white;
`;

const PriceTrendRed = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 12px;
  line-height: 22px;
  letter-spacing: 0.5px;
  font-weight: 400;
  color: #bd2c02;
`;

const PriceTrendBlue = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 12px;
  line-height: 22px;
  letter-spacing: 0.5px;
  font-weight: 400;
  color: #007acc;
`;

const Image = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 6px;
`;

export default StockInfoCard;
