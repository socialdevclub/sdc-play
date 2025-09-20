import styled from '@emotion/styled';
import { SwitchCase } from '@toss/react';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import dayjs from 'dayjs';
import Home from './Home/Home';
import Information from './Information';
import { Tabs, type TabsProps } from './Tabs';
import StockInfoList from './StockInfoList.tsx';
import Portfolio from './Portfolio/index.tsx';
import { Query } from '../../../../../../hook';

const items: TabsProps['items'] = [
  {
    key: '홈',
    label: '홈',
  },
  {
    key: '정보',
    label: '정보',
  },
  {
    key: '주식',
    label: '주식',
  },
  {
    key: '포트폴리오',
    label: '포트폴리오',
  },
];

interface Props {
  stockId: string;
}

const Stock = ({ stockId }: Props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.parentElement?.parentElement?.parentElement?.scrollTo({ top: 0 });
    }
  }, [searchParams]);

  const { mutateAsync: mutateUpdateGame } = Query.Stock.useUpdateStock();
  const { mutateAsync: mutateSetPhase } = Query.Stock.useSetPhase();
  const { mutateAsync: mutateFinishStock } = Query.Stock.useFinishStock(stockId);
  const { data: stock } = Query.Stock.useQueryStock(stockId);

  const startedTime = dayjs(stock?.startedTime).toDate();
  const elapsedTime = Math.floor((Date.now() - startedTime.getTime()) / 1000 / 60); // 분 단위로 변환

  // 주식 게임 자동 종료 및 정산
  useEffect(() => {
    function handleEndGame() {
      mutateFinishStock({ stockId }); // 주식 종료 및 정산
      // FIXME: 큰 스크린 모드에서는 결과 페이지로 이동하지 않는다.
      // 결과 페이지로 이동
      mutateSetPhase({ phase: 'RESULT', stockId });
      messageApi.open({
        content: '게임이 종료되었습니다.',
        duration: 2,
        type: 'info',
      });
    }
    // 변동 주기(fluctuationInterval) * 9 >= 경과 시간 일 때 게임 결산 및 결과 페이지 이동한다.
    if (stock?.isTransaction && elapsedTime >= stock.fluctuationsInterval * 9) {
      handleEndGame();
    }
  }, [
    elapsedTime,
    messageApi,
    mutateFinishStock,
    mutateSetPhase,
    mutateUpdateGame,
    stock?.fluctuationsInterval,
    stock?.isTransaction,
    stockId,
  ]);

  const onClickTab = useCallback(
    (key: string) => {
      switch (key) {
        case '홈':
          setSearchParams({ page: '홈' }, { replace: true });
          break;
        case '정보':
          setSearchParams({ page: '정보' }, { replace: true });
          break;
        case '주식':
          setSearchParams({ page: '주식' }, { replace: true });
          break;
        case '포트폴리오':
          setSearchParams({ page: '포트폴리오' }, { replace: true });
          break;
        default:
          setSearchParams({ page: '홈' }, { replace: true });
          break;
      }
    },
    [setSearchParams],
  );

  const tabItems = useMemo(
    () => (stock?.maxStockHintCount === 0 ? items.filter((item) => item.key !== '정보') : items),
    [stock?.maxStockHintCount],
  );

  return (
    <Container ref={contentRef}>
      <Tabs defaultActiveKey={searchParams.get('page') ?? '홈'} items={tabItems} onChange={onClickTab} />
      <ContentContainer>
        <Suspense fallback={<></>}>
          {contextHolder}
          <SwitchCase
            value={searchParams.get('page') ?? '홈'}
            caseBy={{
              // 룰: <Rule stockId={stockId} />,
              정보: <Information stockId={stockId} messageApi={messageApi} />,
              주식: <StockInfoList stockId={stockId} messageApi={messageApi} />,
              포트폴리오: <Portfolio stockId={stockId} messageApi={messageApi} />,
              홈: <Home stockId={stockId} messageApi={messageApi} />,
            }}
            defaultComponent={<Home stockId={stockId} messageApi={messageApi} />}
          />
        </Suspense>
      </ContentContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: white;
`;

const ContentContainer = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  padding-bottom: 108px;
`;

export default Stock;
