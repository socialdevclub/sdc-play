import styled from '@emotion/styled';
import { objectEntries } from '@toss/utils';
import { useMemo, useState } from 'react';
import { Query } from '../../../../../../hook';
import { getStockMessages } from '../../../../../../utils/stock';
import useV2CardInfo from '../../hook/useV2CardInfo';
import CardV2 from './CardV2';
import StockDrawer from './StockDrawer';

interface Props {
  stockId: string;
}

/**
 * V2 게임 모드 전용 Information 컴포넌트
 *
 * - A형/B형 카드 시스템
 * - 변동률 퍼센티지로 표시 (원 단위 X)
 */
const InformationV2 = ({ stockId }: Props) => {
  const { futureCards, pastCards, fluctuationsInterval, gameTimeInMinutes, stock, userId } = useV2CardInfo({ stockId });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');

  const { timeIdx } = Query.Stock.useQueryStock(stockId);

  const priceData = useMemo(() => {
    const result: Record<string, number[]> = {};
    objectEntries(stock?.companies ?? {}).forEach(([company, companyInfos]) => {
      result[company] = companyInfos.map(({ 가격 }) => 가격);
    });
    return result;
  }, [stock?.companies]);

  // 내 정보 목록 (기존 형식으로 변환 - StockDrawer 호환용)
  const myInfos = useMemo(() => {
    return [...futureCards, ...pastCards].map((card) => ({
      company: card.company,
      price: card.fluctuation, // V2에서는 percentage
      timeIdx: card.timeIdx,
    }));
  }, [futureCards, pastCards]);

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

  if (!stock || !userId) {
    return <>불러오는 중</>;
  }

  return (
    <>
      <Container>
        <TitleWrapper>
          <H1>앞으로의 정보</H1>
          <H2>{futureCards.length}개 보유</H2>
        </TitleWrapper>
        {futureCards.map((card) => (
          <CardV2
            key={`${card.company}_${card.timeIdx}`}
            card={card}
            fluctuationsInterval={fluctuationsInterval}
            gameTimeInMinutes={gameTimeInMinutes}
            onClick={() => handleOpenDrawer(card.company)}
          />
        ))}
        {futureCards.length === 0 && <Empty>현재 시각 이후의 정보가 없습니다</Empty>}

        <Divider />

        <TitleWrapper>
          <H1>지난 정보</H1>
          <H2>{pastCards.length}개 보유</H2>
        </TitleWrapper>
        {pastCards.map((card) => (
          <CardV2
            key={`${card.company}_${card.timeIdx}`}
            card={card}
            fluctuationsInterval={fluctuationsInterval}
            gameTimeInMinutes={gameTimeInMinutes}
            onClick={() => handleOpenDrawer(card.company)}
            isPast
          />
        ))}
        {pastCards.length === 0 && <Empty>현재 시각 이전의 정보가 없습니다</Empty>}
      </Container>

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

export default InformationV2;

// Styled Components
const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 108px;
`;

const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const H1 = styled.div`
  font-size: 16px;
  line-height: 22px;
`;

const H2 = styled.div`
  padding: 2px 8px;
  font-size: 10px;
  line-height: 22px;
  color: #c084fc;
  border-radius: 16px;
  background-color: rgba(192, 132, 252, 0.2);
`;

const Empty = styled.h4`
  font-size: 12px;
  font-weight: 500;
  color: #d4d4d8;
  width: 100%;
  opacity: 70%;
  text-align: center;
  padding: 28px 0 24px;
`;

const Divider = styled.div`
  border-top: 1px solid #374151;
  margin-top: 8px;
  margin-bottom: 8px;
`;
