import styled from '@emotion/styled';
import { objectEntries } from '@toss/utils';
import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import useStockChanges from '../../../../../../hook/query/Stock/useStockChange.ts';
import { getAnimalImageSource, getStockMessages } from '../../../../../../utils/stock.ts';
import { useQueryStock } from '../../../../../../hook/query/Stock';
import { UserStore } from '../../../../../../store';
import StockDrawer from './StockDrawer/index.tsx';

interface Props {
  stockId: string;
}

const StockInfoList = ({ stockId }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');

  const { data: stock, timeIdx } = useQueryStock(stockId);
  const { stockChanges } = useStockChanges({ stockId });

  const priceData = useMemo(() => {
    const result: Record<string, number[]> = {};
    objectEntries(stock?.companies ?? {}).forEach(([company, companyInfos]) => {
      result[company] = companyInfos.map(({ 가격 }) => 가격);
    });
    return result;
  }, [stock?.companies]);

  if (!stock || !userId) {
    return <>불러오는 중</>;
  }

  const myInfos = objectEntries(stock.companies).flatMap(([company, companyInfos]) =>
    companyInfos.reduce((acc, companyInfo, idx) => {
      if (companyInfo.정보.includes(userId)) {
        acc.push({
          company,
          price: idx > 0 ? companyInfo.가격 - companyInfos[idx - 1].가격 : 0,
          timeIdx: idx,
        });
      }
      return acc;
    }, [] as Array<{ company: string; timeIdx: number; price: number }>),
  );

  const stockMessages = getStockMessages({
    companyName: selectedCompany,
    currentTimeIdx: timeIdx ?? 0,
    stockInfos: myInfos,
  });

  const handleOpenDrawer = (company: string) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setSelectedCompany('');
    setDrawerOpen(false);
  };

  return (
    <>
      <CardWrapper>
        {stockChanges.map((stock) => {
          return (
            <StockCardContainer
              onClick={() => handleOpenDrawer(stock.companyName)}
              isActive={stock.companyName === selectedCompany}
              key={stock.companyName}
            >
              <Flex style={{ alignItems: 'center', columnGap: 16, flexDirection: 'row' }}>
                <img src={getAnimalImageSource(stock.companyName)} alt={stock.companyName} width={50} />
                <Flex style={{ gap: 10 }}>
                  <CompanyName>{stock.companyName}</CompanyName>
                  <FlexRowStart>
                    {stock.priceChange >= 0 ? (
                      <PriceTrend>
                        {stock.currentPrice.toLocaleString('ko-KR')} <Red>({`${stock.priceChangePercentage}%`})</Red>
                      </PriceTrend>
                    ) : (
                      <PriceTrend>
                        {stock.currentPrice.toLocaleString('ko-KR')} <Blue>({`${stock.priceChangePercentage}%`})</Blue>
                      </PriceTrend>
                    )}
                  </FlexRowStart>
                </Flex>
              </Flex>
              <ChevronRight size={32} color="#9CA3AF" />
            </StockCardContainer>
          );
        })}
      </CardWrapper>
      <StockDrawer
        drawerOpen={drawerOpen}
        handleCloseDrawer={handleCloseDrawer}
        selectedCompany={selectedCompany}
        stockMessages={stockMessages}
        priceData={priceData}
        stockId={stockId}
      />
    </>
  );
};

const CardWrapper = styled.ul`
  width: 100%;
  padding: 0;
`;

const StockCardContainer = styled.li<{ isActive: boolean }>`
  width: 100%;
  height: 86px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #252836;
  border: 1px solid ${({ isActive }) => (isActive ? '#08A0F7' : '#252836')};
  border-radius: 6px;
  box-shadow: 5px 5px #000000;
  box-sizing: border-box;
  padding: 16px 10px 16px 20px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const Flex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  row-gap: 6px;
`;

const CompanyName = styled.p`
  font-size: 20px;
  line-height: 22px;
  font-weight: 500;
  margin: 0;
  color: white;
  display: flex;
  align-items: center;
  column-gap: 16px;
`;

const Quantity = styled.p`
  font-size: 12px;
  line-height: 14px;
  letter-spacing: 0.5px;
  font-weight: 400;
  color: white;
  opacity: 0.5;
  margin: 0;
`;

const PriceTrend = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  letter-spacing: 0.5px;
  font-weight: 400;
  margin: 0;
  padding: 0;
  gap: 1rem;
`;

const Red = styled.p`
  margin: 0;
  padding: 0;
  color: #bd2c02;
`;

const Blue = styled.p`
  margin: 0;
  padding: 0;
  color: #007acc;
`;

const FlexRowStart = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

export default StockInfoList;
