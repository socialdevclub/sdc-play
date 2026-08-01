import styled from '@emotion/styled';
import { useEffect, useMemo, useState } from 'react';
import { getDateDistance } from '@toss/date';
import { SwitchCase } from '@toss/react';
import { QRCode } from 'antd';
import { PartySchemaWithId } from 'shared~type-party';
import dayjs from 'dayjs';
import { Query } from '../../../../hook';
import prependZero from '../../../../service/prependZero';
import PlayingWrapper from './PlayingWrapper';
import Table from './Table';
import KeyboardHelp from './KeyboardHelp';

interface Props {
  party: PartySchemaWithId;
}

const getTimeDistanceWithCurrent = (date: Date) => {
  const { seconds, minutes } = getDateDistance(date, new Date());
  return `${prependZero(minutes, 2)}:${prependZero(seconds, 2)}`;
};

// playerLength / 3
// 29 - 10
// 30 - 10
export default function StockScreen({ party }: Props) {
  const { data: stock } = Query.Stock.useQueryStock(party.activityName, {
    keepPreviousData: false,
    refetchInterval: 300,
  });
  const { mutateAsync: mutateUpdateStock } = Query.Stock.useUpdateStock();
  const { mutateAsync: mutateFinishStock } = Query.Stock.useFinishStock(stock?._id);
  const { mutateAsync: mutateSetPhase } = Query.Stock.useSetPhase();

  const startedTime = useMemo(() => dayjs(stock?.startedTime).toDate(), [stock?.startedTime]);
  const isTransaction = stock?.isTransaction ?? false;
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const resetTime = (event: KeyboardEvent) => {
      if (event.key !== 'y') {
        return;
      }

      if (!stock?._id) {
        return;
      }

      const isConfirm = window.confirm('시작 시간을 초기화하시겠습니까?');
      if (!isConfirm) {
        return;
      }

      mutateUpdateStock({
        _id: stock._id,
        startedTime: dayjs(new Date()).toISOString(),
      });
    };

    document.addEventListener('keydown', resetTime);

    return () => {
      document.removeEventListener('keydown', resetTime);
    };
  }, [mutateUpdateStock, stock?._id]);

  useEffect(() => {
    const toggleTransaction = (event: KeyboardEvent) => {
      if (event.key !== 't') {
        return;
      }

      if (!stock?._id) {
        return;
      }

      mutateUpdateStock({
        _id: stock._id,
        isTransaction: !isTransaction,
      });
    };

    document.addEventListener('keydown', toggleTransaction);

    return () => {
      document.removeEventListener('keydown', toggleTransaction);
    };
  }, [isTransaction, mutateUpdateStock, startedTime, stock?._id]);

  useEffect(() => {
    const toggleQR = (event: KeyboardEvent) => {
      if (event.key !== 'q') {
        return;
      }

      setShowQR((prev) => !prev);
    };

    document.addEventListener('keydown', toggleQR);

    return () => {
      document.removeEventListener('keydown', toggleQR);
    };
  }, []);

  useEffect(() => {
    const finishStock = (event: KeyboardEvent) => {
      if (event.key !== 'e') {
        return;
      }

      if (!stock?._id) {
        return;
      }

      const isConfirm = window.confirm('게임을 종료하고 RESULT 화면으로 전환하시겠습니까?');
      if (!isConfirm) {
        return;
      }

      mutateFinishStock({ stockId: stock._id });
      mutateSetPhase({ phase: 'RESULT', stockId: stock._id });
    };

    document.addEventListener('keydown', finishStock);

    return () => {
      document.removeEventListener('keydown', finishStock);
    };
  }, [mutateFinishStock, mutateSetPhase, stock?._id]);

  const [time, setTime] = useState(() => {
    return getTimeDistanceWithCurrent(startedTime);
  });

  useEffect(() => {
    const updateTimer = () => {
      setTime(getTimeDistanceWithCurrent(startedTime));
    };
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [startedTime]);

  if (!stock?._id) {
    return <></>;
  }

  return (
    <>
      <KeyboardHelp />
      <SwitchCase
        value={stock.stockPhase}
        caseBy={{
          PLAYING: showQR ? (
            <>
              <TimeBox>QR코드를 스캔하여 입장하세요</TimeBox>
              <Wrapper>
                <Container>
                  <QRCode value={`${window.location.origin}/party/${party._id}`} bgColor="#ffffff" size={300} />
                  <QRInfo>
                    <QRUrl>{`${window.location.origin}/party/${party._id}`}</QRUrl>
                  </QRInfo>
                </Container>
              </Wrapper>
            </>
          ) : (
            <PlayingWrapper stockId={stock._id}>
              <TimeBox>{time}</TimeBox>
              <Wrapper>
                <Container>{isTransaction && <Table stockId={stock._id} />}</Container>
              </Wrapper>
            </PlayingWrapper>
          ),
          RESULT: (
            <>
              <TimeBox>소셜데브클럽이 궁금하다면?</TimeBox>
              <Wrapper>
                <Container>
                  <QRCode value="https://www.instagram.com/socialdev.club/" bgColor="#ffffff" size={300} />
                </Container>
              </Wrapper>
            </>
          ),
        }}
        defaultComponent={
          <>
            <TimeBox>QR코드를 스캔하여 입장하세요</TimeBox>
            <Wrapper>
              <Container>
                <QRCode value={`${window.location.origin}/party/${party._id}`} bgColor="#ffffff" size={300} />
                <QRInfo>
                  <QRUrl>{`${window.location.origin}/party/${party._id}`}</QRUrl>
                </QRInfo>
              </Container>
            </Wrapper>
          </>
        }
      />
    </>
  );
}

const Wrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;

  width: 100%;
  height: 100%;

  padding: 180px 120px;
  box-sizing: border-box;
  background: linear-gradient(to bottom, #111827, #000000);
`;

const TimeBox = styled.div`
  position: absolute;
  text-align: center;
  width: 100%;
  top: 100px;

  font-size: 52px;
  color: white;
  z-index: 1;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;

  width: 100%;
  height: 100%;

  border-radius: 4px;
  box-shadow: 5px 5px 10px #000000;
  background-color: #252836;

  padding: 20px 0;
`;

const QRInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const QRUrl = styled.p`
  font-size: 16px;
  color: #667eea;
  margin: 8px 0 0 0;
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  font-family: monospace;
`;
