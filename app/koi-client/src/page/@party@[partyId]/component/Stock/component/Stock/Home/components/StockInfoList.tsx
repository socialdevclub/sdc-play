import styled from '@emotion/styled';
import { objectEntries } from '@toss/utils';
import { MessageInstance } from 'antd/es/message/interface';
import { useMemo, useState } from 'react';
import DoughnutChart from '../../../../component-presentation/DoughnutChart.tsx';
import StockInfoCard from '../../../../component-presentation/StockInfoCard.tsx';
import { Query } from '../../../../../../../../hook/index.ts';
import { useQueryStock } from '../../../../../../../../hook/query/Stock';
import useStockHoldings from '../../../../hook/useStockHoldings.tsx';
import { getStockMessages } from '../../../../../../../../utils/stock.ts';
import StockDrawer from '../../StockDrawer/index.tsx';
import { H3, TitleWrapper } from '../Home.styles.tsx';
import { calculatePortfolioAllocationWithAllStocks } from '../../../../utils/calculatePortfolioAllocation.ts';
import { formatRatio } from '../../../../utils/calculatePercentage.ts';
import { getAssetColor } from '../../../../utils/getAssetColor';

interface StockHoldingsListProps {
  stockId: string;
  userId: string;
  messageApi: MessageInstance;
}

export const StockHoldingsList = ({ stockId, userId, messageApi }: StockHoldingsListProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');

  const { holdings } = useStockHoldings({ stockId, userId });

  const { data: stock, timeIdx } = useQueryStock(stockId);
  const { data: user } = Query.Stock.useUserFindOne(stockId, userId);

  const priceData = useMemo(() => {
    const result: Record<string, number[]> = {};
    objectEntries(stock?.companies ?? {}).forEach(([company, companyInfos]) => {
      result[company] = companyInfos.map(({ 가격 }) => 가격);
    });
    return result;
  }, [stock?.companies]);

  if (!stock || !user || !userId || timeIdx === undefined) {
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

  const portfolioAllocation = calculatePortfolioAllocationWithAllStocks(stock, user, timeIdx);
  const portfolioAllValue = portfolioAllocation.companies.reduce((acc, curr) => acc + curr.value, 0);

  const portfolioData = [
    // 주식 데이터 (종목별 색상 포함)
    ...portfolioAllocation.companies.map((company) => ({
      color: getAssetColor(company.name),
      label: `${company.name}`,
      value: company.value, // 종목별 고정 색상 추가
    })),
  ];

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

  const sortedHoldings = [...holdings].sort((a, b) => b.totalValue - a.totalValue);

  return (
    <>
      <TitleWrapper>
        <H3>보유 중인 주식</H3>
      </TitleWrapper>
      <Space />
      <Container>
        {sortedHoldings.length > 0 || user.money > 0 ? (
          <>
            <DoughnutChart data={portfolioData} minHeight={200} maxHeight={200} />
            {sortedHoldings.length > 0 ? (
              sortedHoldings.map((stock) => (
                <StockInfoCard
                  key={stock.companyName}
                  companyName={stock.companyName}
                  stockCount={stock.stockCount}
                  onClick={handleOpenDrawer}
                  totalValue={stock.totalValue}
                  profitLoss={stock.profitLoss}
                  profitLossPercentage={parseFloat(stock.profitLossPercentage.toFixed(1))}
                  investmentRatio={formatRatio(
                    portfolioAllocation.companies.find((v) => v.name === stock.companyName)?.value ?? 0,
                    portfolioAllValue,
                  )}
                />
              ))
            ) : (
              <Label>보유 중인 주식이 없습니다.</Label>
            )}
          </>
        ) : (
          <Label>보유 중인 주식과 현금이 없습니다.</Label>
        )}
      </Container>
      <StockDrawer
        drawerOpen={drawerOpen}
        handleCloseDrawer={handleCloseDrawer}
        selectedCompany={selectedCompany}
        stockMessages={stockMessages}
        priceData={priceData}
        stockId={stockId}
        messageApi={messageApi}
      />
    </>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.6rem;
`;
const Space = styled.div`
  margin-block: 0.5rem;
`;
const Label = styled.span`
  font-size: 15px;
  color: gray;
`;
