import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import useRoundTimeRaceCheck from '../../../../../../../../hook/useRoundTimeRaceCheck.tsx'; // 경로 확인 필요
import { useQueryParty } from '../../../../../../../../hook/query/Party'; // 경로 확인 필요
import { useQueryStock } from '../../../../../../../../hook/query/Stock'; // 경로 확인 필요
import Card from '../../../../../../../../component-presentation/Card.tsx'; // 경로 확인 필요
import { secondsToMMSS, formatPercentage } from '../../../../../../../../utils/stock.ts'; // 경로 확인 필요
import * as COLOR from '../../../../../../../../config/color.ts'; // 경로 확인 필요

const TimeIndicator = () => {
  const { partyId } = useParams();
  const { data: party } = useQueryParty(partyId ?? '');
  // activityName이 비어있거나 undefined일 경우 useQueryStock 호출 방지 또는 기본값 처리 필요
  const { data: stock, refetch } = useQueryStock(party?.activityName ?? '');

  const { roundTime, elapsedTime, currentRound, totalRounds, totalElapsedTime } = useRoundTimeRaceCheck({
    refetch,
    stock,
  });

  return (
    <Card
      title="경과 시간"
      value={secondsToMMSS(totalElapsedTime)} // 현재 라운드의 경과 시간 표시
      rightComponent={
        <ProgressBar
          roundTime={roundTime}
          totalElapsedTime={totalElapsedTime} // 전체 누적 경과 시간 사용
          currentRound={currentRound}
          totalRounds={totalRounds}
        />
      }
    />
  );
};

export default TimeIndicator;

interface ProgressBarProps {
  roundTime: number;
  totalElapsedTime: number;
  currentRound: number;
  totalRounds: number;
}

function ProgressBar({ roundTime, totalElapsedTime, currentRound, totalRounds }: ProgressBarProps) {
  const percentage = useMemo((): number => {
    // totalRounds 또는 roundTime이 0 이하일 경우 totalTime이 0 또는 음수가 될 수 있음.
    // useRoundTimeRaceCheck 훅에서 totalRounds를 최소 1로, roundTime도 양수로 보장한다고 가정.
    if (totalRounds <= 0 || roundTime <= 0) return 0;

    const totalTime = roundTime * totalRounds;
    // totalTime이 0이면 0% 반환 (위 조건으로 이미 커버되지만, 명시적 방어)
    if (totalTime <= 0) return 0;

    // 경과 시간이 전체 시간을 초과하지 않도록 제한
    const clampedTotalElapsedTime = Math.min(totalElapsedTime, totalTime);

    // 진행률 계산 및 소수점 첫째 자리까지 반올림
    return formatPercentage(clampedTotalElapsedTime / totalTime);
  }, [roundTime, totalElapsedTime, totalRounds]);

  return (
    <ProgressBarWrapper>
      <RoundIndicator>{currentRound}ROUND</RoundIndicator>
      <ProgressBarContainer>
        <ProgressFill percentage={percentage} />
        {/* totalRounds가 1이면 구분선 없음 (length: 0) */}
        {/* totalRounds가 0이하인 경우는 훅에서 방지*/}
        {Array.from({ length: Math.max(0, totalRounds - 1) }).map((_, index) => {
          // 각 라운드의 경계에 구분선 배치
          // totalRounds가 0이나 1이면 position 계산 시 분모가 0이 될 수 있으므로 방어 코드 추가
          const position = totalRounds > 0 ? ((index + 1) / totalRounds) * 100 : 0;
          // eslint-disable-next-line react/no-array-index-key
          return <VerticalDivider key={index} position={position} />; // key를 index로 사용 (안정적)
        })}
      </ProgressBarContainer>
    </ProgressBarWrapper>
  );
}

interface VerticalDividerProps {
  position: number;
}

interface ProgressFillProps {
  percentage: number;
  color?: string;
}

const VerticalDivider = styled.div<VerticalDividerProps>`
  position: absolute;
  top: -2px;
  left: ${(props: VerticalDividerProps) => props.position}%;
  width: 2px;
  height: 0.5rem; /* Increased height */
  background-color: #000000;
  z-index: 2;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 0;
    width: 2px;
    background-color: #000000;
  }

  &::before {
    top: -0.1rem;
    height: 0.1rem;
  }

  &::after {
    bottom: -0.1rem;
    height: 0.1rem;
  }
`;

const ProgressBarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  width: 75%;
  padding-left: 20px;
  height: 44px;
  position: relative;
  gap: 0.6rem;
  z-index: 0;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 4px;
  background-color: #000000;
  border-radius: 5px;
  overflow: visible;
  position: relative;
  z-index: 0;
`;

const ProgressFill = styled.div<ProgressFillProps>`
  height: 100%;
  background-color: ${(props: ProgressFillProps) => props.color || COLOR.violet};
  width: ${(props: ProgressFillProps) => Math.min(props.percentage, 100)}%;
  border-radius: 5px;
  transition: width 0.3s ease;
  position: relative;
  z-index: 1;
`;

const RoundIndicator = styled.div`
  background-color: ${COLOR.green}33;
  font-weight: bold;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  letter-spacing: 0.5px;
  line-height: 16px;
  color: ${COLOR.pastelGreen};
  transform: translateY(-15%);
  z-index: 1;
`;
