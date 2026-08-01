import styled from '@emotion/styled';
import { colorDown, colorUp } from '../../../../../../config/color';
import prependZero from '../../../../../../service/prependZero';
import { getAnimalImageSource } from '../../../../../../utils/stock';
import type { V2CardInfo, V2CardType } from '../../hook/useV2CardInfo';

interface CardV2Props {
  card: V2CardInfo;
  /** 변동 주기 (분) */
  fluctuationsInterval: number;
  /** 현재 게임 시간 (분) */
  gameTimeInMinutes: number;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 과거 카드 여부 (투명도 적용) */
  isPast?: boolean;
}

/**
 * V2 전용 카드 컴포넌트
 *
 * - A형: 종목명 + 변동률% (라운드/방향 숨김)
 * - B형: 라운드 + 방향 + 변동률% (종목명 숨김)
 */
const CardV2 = ({ card, fluctuationsInterval, gameTimeInMinutes, onClick, isPast = false }: CardV2Props) => {
  const { cardType, company, timeIdx, fluctuation, direction } = card;
  const infoTimeInMinutes = timeIdx * fluctuationsInterval;

  // 시간 표시
  const timeDiff = isPast ? gameTimeInMinutes - infoTimeInMinutes : infoTimeInMinutes - gameTimeInMinutes;

  const timeLabel =
    cardType === 'A'
      ? '?분 후'
      : isPast
      ? timeDiff <= 1
        ? '방금 전'
        : `${timeDiff}분 전`
      : timeDiff <= 1
      ? '임박'
      : `${timeDiff}분 후`;

  const isUrgent = cardType === 'B' && !isPast && timeDiff <= 1;

  return (
    <Container onClick={cardType === 'A' ? onClick : undefined} isPast={isPast}>
      <LeftSection>
        <TimeWrapper isUrgent={isUrgent} isPast={isPast}>
          <TimeLabel isUrgent={isUrgent} isPast={isPast}>
            {isUrgent && '🚨 '}
            {timeLabel}
          </TimeLabel>
          <ChangeTime>{cardType === 'A' ? '??' : prependZero(infoTimeInMinutes, 2)}:00</ChangeTime>
        </TimeWrapper>
        <CardContent cardType={cardType} company={company} timeIdx={timeIdx} direction={direction} />
      </LeftSection>
      <FluctuationValue color={colorUp}>{Math.abs(fluctuation)}%</FluctuationValue>
    </Container>
  );
};

/**
 * 카드 타입에 따른 콘텐츠 렌더링
 */
interface CardContentProps {
  cardType: V2CardType;
  company: string;
  timeIdx: number;
  direction: 'up' | 'down';
}

const CardContent = ({ cardType, company, timeIdx, direction }: CardContentProps) => {
  if (cardType === 'A') {
    // A형: 종목명 표시
    return (
      <ContentWrapper>
        <CompanyImage src={getAnimalImageSource(company)} alt={company} />
        <CompanyName>{company.slice(0, 4)}</CompanyName>
      </ContentWrapper>
    );
  }

  // B형: 라운드 + 방향 표시
  const directionLabel = direction === 'up' ? '▲ 상승' : '▼ 하락';
  const directionColor = direction === 'up' ? colorUp : colorDown;

  return (
    <ContentWrapper>
      <UnknownIcon>?</UnknownIcon>
      <DirectionLabel color={directionColor}>{directionLabel}</DirectionLabel>
    </ContentWrapper>
  );
};

export default CardV2;

// Styled Components
const Container = styled.div<{ isPast?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #252836;
  border-radius: 8px;
  padding: 16px;
  overflow: hidden;
  opacity: ${({ isPast }) => (isPast ? 0.5 : 1)};
  cursor: pointer;

  &:hover {
    background-color: #2d3142;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TimeWrapper = styled.div<{ isUrgent?: boolean; isPast?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: ${({ isUrgent }) => (isUrgent ? 'rgba(249, 98, 87, 0.2)' : '#374151')};
  padding: 8px 10px;
  border-radius: 4px;
  min-width: 60px;
  gap: 2px;
`;

const TimeLabel = styled.div<{ isUrgent?: boolean; isPast?: boolean }>`
  font-size: 12px;
  color: ${({ isUrgent, isPast }) => (isUrgent ? '#f96257' : isPast ? '#ffffff' : '#c084fc')};
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const ChangeTime = styled.div`
  font-size: 11px;
  color: #9ca3af;
  letter-spacing: 0.5px;
`;

const ContentWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CompanyImage = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 4px;
`;

const CompanyName = styled.span`
  font-size: 18px;
  line-height: 22px;
  letter-spacing: 0.5px;
  color: #ffffff;
`;

const UnknownIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #9ca3af;
`;

const RoundInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RoundLabel = styled.span`
  font-size: 16px;
  color: #ffffff;
  letter-spacing: 0.5px;
`;

const DirectionLabel = styled.span<{ color: string }>`
  font-size: 14px;
  color: ${({ color }) => color};
  letter-spacing: 0.5px;
`;

const CardTypeBadge = styled.span<{ cardType: V2CardType }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: ${({ cardType }) => (cardType === 'A' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(192, 132, 252, 0.2)')};
  color: ${({ cardType }) => (cardType === 'A' ? '#60A5FA' : '#c084fc')};
  font-weight: 500;
`;

const FluctuationValue = styled.div<{ color: string }>`
  font-size: 24px;
  font-weight: 500;
  color: ${({ color }) => color};
  letter-spacing: 0.5px;
`;
