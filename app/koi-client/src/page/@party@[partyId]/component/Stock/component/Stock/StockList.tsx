import styled from '@emotion/styled';
import { objectEntries } from '@toss/utils';
import { useAtomValue } from 'jotai';
import { useMemo, useState } from 'react';
import StockCard from '../../../../../../component-presentation/StockCard';
import { Query } from '../../../../../../hook';
import { UserStore } from '../../../../../../store';
import { getAnimalImageSource, getStockMessages } from '../../../../../../utils/stock';
import StockDrawer from './StockDrawer';

interface Props {
  stockId: string;
  stockNames: string[];
}

const StockList = ({ stockId, stockNames }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

  const { data: stock, timeIdx } = Query.Stock.useQueryStock(stockId);
  const { user } = Query.Stock.useUser({ stockId, userId });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');

  const priceData = useMemo(() => {
    const result: Record<string, number[]> = {};
    objectEntries(stock?.companies ?? {}).forEach(([company, companyInfos]) => {
      result[company] = companyInfos.map(({ 가격 }) => 가격);
    });
    return result;
  }, [stock?.companies]);

  const 보유주식 = useMemo(() => {
    return (
      user?.stockStorages
        .filter(({ stockCountCurrent }) => stockCountCurrent > 0)
        .map(({ companyName, stockCountCurrent }) => ({
          company: companyName,
          count: stockCountCurrent,
        })) ?? []
    );
  }, [user?.stockStorages]);

  const 미보유주식 = useMemo(() => {
    return stockNames.filter((company) => !보유주식.some(({ company: c }) => c === company));
  }, [stockNames, 보유주식]);

  if (!stock || !userId || !user) {
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
      <StockItems
        보유주식={보유주식}
        미보유주식={미보유주식}
        selectedCompany={selectedCompany}
        onClick={handleOpenDrawer}
      />
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

export default StockList;

interface StockItemsProps {
  보유주식: Array<{ company: string; count: number }>;
  미보유주식: string[];
  selectedCompany: string;
  onClick: (company: string) => void;
}

const StockItems = ({ 보유주식, 미보유주식, selectedCompany, onClick }: StockItemsProps) => {
  return (
    <>
      {보유주식.length > 0 && (
        <>
          <SectionTitle>보유 중인 주식</SectionTitle>
          {보유주식.map(({ company, count }) => (
            <StockCard
              key={company}
              company={company.slice(0, 4)}
              quantity={count}
              onClick={() => onClick(company)}
              isActive={company === selectedCompany}
              src={getAnimalImageSource(company)}
              width={50}
            />
          ))}
          {미보유주식.length > 0 && <Divider />}
        </>
      )}
      {미보유주식.length > 0 && (
        <>
          <SectionTitle>보유하지 않은 주식</SectionTitle>
          {미보유주식.map((company) => (
            <StockCard
              key={company}
              company={company.slice(0, 4)}
              quantity={0}
              onClick={() => onClick(company)}
              isActive={company === selectedCompany}
              src={getAnimalImageSource(company)}
              width={50}
            />
          ))}
        </>
      )}
    </>
  );
};

const SectionTitle = styled.h4`
  font-size: 16px;
  line-height: 22px;
  font-weight: 500;
  margin: 4px 0 12px 4px;
  color: white;
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background-color: #374151;
  margin: 8px 0 16px 0;
`;
