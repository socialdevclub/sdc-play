import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { commaizeNumber, objectEntries } from '@toss/utils';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageInstance } from 'antd/es/message/interface';
import InfoBox from '../../../../../../component-presentation/InfoBox';
import { colorDown, colorUp } from '../../../../../../config/color';
import { Query } from '../../../../../../hook';
import prependZero from '../../../../../../service/prependZero';
import { UserStore } from '../../../../../../store';
import { getAnimalImageSource, getFormattedGameTime, getStockMessages } from '../../../../../../utils/stock';
import DrawStockInfo from './DrawInfo';
import StockDrawer from './StockDrawer';

interface Props {
  stockId: string;
  messageApi: MessageInstance;
}

const Information = ({ stockId, messageApi }: Props) => {
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
      <InformationItems stockId={stockId} onClick={handleOpenDrawer} myInfos={myInfos} />
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

export default Information;

interface InformationItemsProps {
  stockId: string;
  onClick: (company: string) => void;
  myInfos: Array<{ company: string; timeIdx: number; price: number }>;
}

const InformationItems = ({ stockId, onClick, myInfos }: InformationItemsProps) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

  const { data: stock, refetch } = Query.Stock.useQueryStock(stockId);
  const { user } = Query.Stock.useUser({ stockId, userId });
  const [gameTime, setGameTime] = useState(getFormattedGameTime(stock?.startedTime));
  const gameTimeRef = useRef(gameTime);

  useEffect(() => {
    if (!stock?.startedTime) return () => {};

    const interval = setInterval(() => {
      const newGameTime = getFormattedGameTime(stock.startedTime);

      if (newGameTime !== gameTimeRef.current) {
        const newGameMinute = parseInt(newGameTime.split(':')[0], 10);
        const lastGameMinute = parseInt(gameTimeRef.current.split(':')[0], 10);

        gameTimeRef.current = newGameTime;
        setGameTime(newGameTime);

        if (newGameMinute !== lastGameMinute) {
          refetch();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stock?.startedTime, refetch]);

  if (!user || !stock) {
    return <div>불러오는 중.</div>;
  }

  const gameTimeInSeconds = parseInt(gameTime.split(':')[0], 10) * 60 + parseInt(gameTime.split(':')[1], 10);
  const gameTimeInMinutes = Math.ceil(parseInt(gameTime.split(':')[0], 10));

  const { futureInfos, pastInfos } = myInfos.reduce(
    (acc, info) => {
      const infoTimeInSeconds = stock?.fluctuationsInterval && info.timeIdx * 60 * stock.fluctuationsInterval;

      if (infoTimeInSeconds >= gameTimeInSeconds) {
        let index = acc.futureInfos.findIndex((item) => item.timeIdx > info.timeIdx);
        if (index === -1) index = acc.futureInfos.length;
        acc.futureInfos.splice(index, 0, info);
      } else {
        let index = acc.pastInfos.findIndex((item) => item.timeIdx < info.timeIdx);
        if (index === -1) index = acc.pastInfos.length;
        acc.pastInfos.splice(index, 0, info);
      }

      return acc;
    },
    {
      futureInfos: [] as Array<{
        company: string;
        timeIdx: number;
        price: number;
      }>,
      pastInfos: [] as Array<{
        company: string;
        timeIdx: number;
        price: number;
      }>,
    },
  );

  return (
    <Container>
      <TitleWrapper>
        <H1>앞으로의 정보</H1>
        <H2>{futureInfos.length}개 보유</H2>
      </TitleWrapper>
      {futureInfos.map(({ company, price, timeIdx }) => {
        const infoTimeInMinutes = timeIdx * stock.fluctuationsInterval;
        const remainingTime = infoTimeInMinutes - gameTimeInMinutes;

        return (
          <InfoBox
            key={`${company}_${timeIdx}`}
            title={company.slice(0, 4)}
            onClick={() => onClick(company)}
            src={getAnimalImageSource(company)}
            value={`${price >= 0 ? '▲' : '▼'}${commaizeNumber(Math.abs(price))}`}
            valueColor={price >= 0 ? colorUp : colorDown}
            leftTime={
              <div
                css={css`
                  font-size: 14px;
                  color: #c084fc;
                  min-width: 50px;
                  letter-spacing: 0.5px;
                `}
              >
                {remainingTime <= 1 ? <span style={{ color: '#f96257' }}>🚨 임박</span> : `${remainingTime}분 후`}
              </div>
            }
            changeTime={
              <div
                css={css`
                  font-size: 12px;
                  color: #9ca3af;
                  letter-spacing: 0.5px;
                `}
              >
                {prependZero(timeIdx * stock.fluctuationsInterval, 2)}:00
              </div>
            }
          />
        );
      })}
      {futureInfos.length === 0 && <Empty>현재 시각 이후의 정보가 없습니다</Empty>}

      <Divider />

      <TitleWrapper>
        <H1>지난 정보</H1>
        <H2>{pastInfos.length}개 보유</H2>
      </TitleWrapper>

      {pastInfos.map(({ company, price, timeIdx }) => {
        const pastTime = gameTimeInMinutes - timeIdx * stock.fluctuationsInterval;
        return (
          <InfoBox
            key={`${company}_${timeIdx}`}
            title={company.slice(0, 4)}
            src={getAnimalImageSource(company)}
            value={`${price >= 0 ? '▲' : '▼'}${commaizeNumber(Math.abs(price))}`}
            valueColor={price >= 0 ? colorUp : colorDown}
            opacity={0.5}
            onClick={() => onClick(company)}
            leftTime={
              <div
                css={css`
                  font-size: 14px;
                  color: #ffffff;
                  min-width: 50px;
                  letter-spacing: 0.5px;
                `}
              >
                {pastTime <= 1 ? '방금 전' : `${pastTime}분 전`}
              </div>
            }
            changeTime={
              <div
                css={css`
                  font-size: 12px;
                  color: #9ca3af;
                  letter-spacing: 0.5px;
                `}
              >
                {prependZero(timeIdx * stock.fluctuationsInterval, 2)}:00
              </div>
            }
          />
        );
      })}
      {pastInfos.length === 0 && <Empty>현재 시각 이전의 정보가 없습니다</Empty>}

      {/* <Divider />

      <RecommendedPartners stockId={stockId} /> */}

      <StickyBottom>
        <DrawStockInfo stockId={stockId} />
      </StickyBottom>
    </Container>
  );
};

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

const StickyBottom = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #252836;
  border-top: 1px solid #374151;
  padding: 16px;
  box-sizing: border-box;
`;
