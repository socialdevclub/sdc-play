import { css, keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import React, { useEffect, useState } from 'react';
import { PROFIT_BADGE_COLOR } from '../page/@party@[partyId]/component/Stock/color';

interface AnimatedInfoHeaderProps {
  title: string;
  subtitle?: string;
  subTitleColor?: string;
  value: string | number;
  valueFormatted?: string;
  valueColor?: string;
  badge?: {
    text: string;
    color: string;
  };
  rightContent?: React.ReactNode;
  src?: string;
  width?: number;
  // 애니메이션 관련 props
  currentStockCount: number;
  onStockCountChange?: (delta: number) => void;
}

const pulseKeyframes = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const slideUpKeyframes = keyframes`
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  50% {
    transform: translateY(-5px);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 0;
  }
`;

const flashSellKeyframes = keyframes`
  0% { background-color: transparent; }
  50% { background-color: ${PROFIT_BADGE_COLOR.LOSS}; }
  100% { background-color: transparent; }
`;

const flashBuyKeyframes = keyframes`
  0% { background-color: transparent; }
  50% { background-color: ${`rgb(0, 122, 255, 0.2)`}; }
  100% { background-color: transparent; }
`;

const AnimatedInfoHeader = (props: AnimatedInfoHeaderProps) => {
  const {
    title,
    subtitle,
    subTitleColor = '#d1d5db',
    value,
    valueFormatted,
    valueColor = 'white',
    badge,
    rightContent,
    src,
    width = 50,
    currentStockCount,
    onStockCountChange,
  } = props;

  const [prevStockCount, setPrevStockCount] = useState(currentStockCount);
  const [delta, setDelta] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showDelta, setShowDelta] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (currentStockCount !== prevStockCount) {
      const deltaValue = currentStockCount - prevStockCount;

      // 애니메이션 강제 리셋을 위해 먼저 상태를 false로 설정
      setShowAnimation(false);
      setShowDelta(false);

      // 다음 프레임에서 새로운 애니메이션 시작
      requestAnimationFrame(() => {
        setDelta(deltaValue);
        setShowAnimation(true);
        setShowDelta(true);
        setAnimationKey((prev) => prev + 1); // 애니메이션 키 증가로 강제 리렌더
        onStockCountChange?.(deltaValue);
      });

      // 애니메이션 타이밍
      setTimeout(() => setShowAnimation(false), 500);
      setTimeout(() => setShowDelta(false), 500);

      setPrevStockCount(currentStockCount);
    }
  }, [currentStockCount, prevStockCount, onStockCountChange]);

  return (
    <Container>
      <FlexRow>
        <div
          css={css`
            display: flex;
            align-items: center;
          `}
        >
          {src && <img src={src} alt={title} width={width} />}
          <FlexColumn>
            <Title>{title}</Title>
            {subtitle && (
              <SubtitleContainer isAnimating={showAnimation} delta={delta}>
                <Subtitle style={{ color: subTitleColor }}>{subtitle}</Subtitle>
                {showDelta && (
                  <DeltaIndicator key={animationKey} delta={delta}>
                    {delta > 0 ? `+${delta}` : delta}
                  </DeltaIndicator>
                )}
              </SubtitleContainer>
            )}
          </FlexColumn>
        </div>
        <FlexColumn style={{ alignItems: 'flex-end', rowGap: '8px' }}>
          <Value style={{ color: valueColor }}>{valueFormatted || value}</Value>
          {badge && (
            <Badge>
              <BadgeText style={{ color: badge.color }}>{badge.text}</BadgeText>
            </Badge>
          )}
          {rightContent}
        </FlexColumn>
      </FlexRow>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
`;

const FlexRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  row-gap: 4px;
`;

const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  row-gap: 4px;
`;

const Title = styled.p`
  font-size: 20px;
  line-height: 22px;
  font-weight: 500;
  margin: 0;
  color: white;
  padding: 0 6px;
`;

const SubtitleContainer = styled.div<{ isAnimating: boolean; delta: number }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;

  ${({ isAnimating, delta }) =>
    isAnimating &&
    css`
      animation: ${delta > 0 ? flashSellKeyframes : flashBuyKeyframes} 500ms ease-out;
    `}
`;

const Subtitle = styled.p<{ isAnimating?: boolean }>`
  font-size: 12px;
  line-height: 20px;
  letter-spacing: 0.5px;
  font-weight: 400;
  margin: 0;
  transition: all 0.3s ease;

  ${({ isAnimating }) =>
    isAnimating &&
    css`
      animation: ${pulseKeyframes} 500ms ease-out;
    `}
`;

const DeltaIndicator = styled.span<{ delta: number }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: ${({ delta }) => (delta > 0 ? PROFIT_BADGE_COLOR.LOSS : `rgb(0, 122, 255, 0.2)`)};
  color: ${({ delta }) => (delta > 0 ? '#DC2626' : '#007acc')};
  animation: ${slideUpKeyframes} 1s ease-out;
  position: absolute;
  top: -25px;
  right: -10px;
`;

const Value = styled.span`
  font-size: 32px;
  line-height: 20px;
  font-weight: 400;
`;

const Badge = styled.div`
  padding: 4px 8px;
  border-radius: 100px;
`;

const BadgeText = styled.span`
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0.5px;
  font-weight: 400;
`;

export default AnimatedInfoHeader;
