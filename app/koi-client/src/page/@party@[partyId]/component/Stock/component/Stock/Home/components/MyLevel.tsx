import styled from '@emotion/styled';
import { Image } from 'antd';
import * as COLOR from '../../../../../../../../config/color';
import { LEVEL_INFO, type LevelInfoType } from '../../../../../../../../config/level';

type Props = {
  moneyRatio: string | number;
  initialMoney: number;
};

/**
 * 문자열이나 숫자를 숫자로 변환하는 함수
 * 문자열에 '%'가 포함되어 있으면 제거하고 숫자로 변환
 */
const parseRatio = (ratio: string | number): number => {
  if (typeof ratio === 'number') return ratio;

  // '%' 기호 제거 후 숫자로 변환
  return parseFloat(ratio.replace('%', ''));
};

/**
 * moneyRatio에 따른 레벨을 반환하는 함수
 */
const getLevelByRatio = (ratio: string | number): LevelInfoType & { index: number } => {
  // ratio를 숫자로 변환
  const percentage = parseRatio(ratio);

  // 해당하는 레벨 찾기
  const levelIndex = LEVEL_INFO.findIndex((level) => percentage >= level.min && percentage < level.max);
  const level = LEVEL_INFO[levelIndex];

  // 레벨이 없으면 기본값 반환
  return level ? { ...level, index: levelIndex } : { ...LEVEL_INFO[0], index: 0 };
};

/**
 * 다음 레벨까지의 진행률을 계산하는 함수
 */
const calculateProgress = (ratio: number, min: number, max: number): number => {
  // 현재 레벨 범위 내에서의 진행률 (0-100%)
  if (max === Number.POSITIVE_INFINITY) return 100;
  if (min === Number.NEGATIVE_INFINITY) return 0;

  const rangeSize = max - min;
  const position = ratio - min;
  return Math.min(Math.max((position / rangeSize) * 100, 0), 100);
};

/**
 * 다음 레벨까지 필요한 추가 수익 금액을 계산하는 함수
 */
const calculateRequiredMoney = (ratio: number, max: number, initialMoney: number): number => {
  if (max === Number.POSITIVE_INFINITY) return 0;

  // 현재 금액 = 초기금액 * (1 + ratio/100)
  const currentMoney = initialMoney * (1 + ratio / 100);

  // 목표 금액 = 초기금액 * (1 + max/100)
  const targetMoney = initialMoney * (1 + max / 100);

  // 필요한 추가 금액
  return Math.max(0, targetMoney - currentMoney);
};

export const MyLevel = ({ moneyRatio, initialMoney }: Props) => {
  const percentage = parseRatio(moneyRatio);
  const levelInfo = getLevelByRatio(moneyRatio);
  const progress = calculateProgress(percentage, levelInfo.min, levelInfo.max);
  const requiredMoney = calculateRequiredMoney(percentage, levelInfo.max, initialMoney);

  const nextLevelProgress = Math.floor(progress);

  return (
    <Container>
      <LeftSection>
        <AnimalImage src={`/animal/${levelInfo.animal}.jpg`} />
        <LevelIndicator>Lv.{levelInfo.index}</LevelIndicator>
      </LeftSection>
      <RightSection>
        <TopSection>
          <LevelInfo>
            <LevelLabel>{levelInfo.label}</LevelLabel>
            {levelInfo.nextLabel && (
              <NextLevel>
                → <span>{levelInfo.nextLabel}</span>
              </NextLevel>
            )}
          </LevelInfo>
          <PercentValue>{nextLevelProgress}%</PercentValue>
        </TopSection>

        <ProgressBarContainer>
          <ProgressBar progress={progress} color={levelInfo.color} />
        </ProgressBarContainer>

        <BottomSection>
          <NextLevelInfo>
            {levelInfo.max !== Number.POSITIVE_INFINITY ? (
              <>
                <span>추가 수익 </span>
                <NextLevelMoney>{Math.ceil(requiredMoney).toLocaleString()}원</NextLevelMoney>
                <span>을 달성하면 레벨 업!</span>
              </>
            ) : (
              '최고 레벨 달성!'
            )}
          </NextLevelInfo>
        </BottomSection>
      </RightSection>
    </Container>
  );
};

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
`;

const LeftSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding-right: 20px;
`;

const AnimalImage = styled(Image)`
  max-width: 64px;
  max-height: 64px;
  min-width: 64px;
  min-height: 64px;
  border-radius: 50%;
`;

const Container = styled.div`
  display: flex;
  width: 100%;
  color: white;
  padding: 20px;
  gap: 8px;
  justify-content: space-between;
  border-radius: 12px;
  box-sizing: border-box;
  background-color: #252836;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #374151;
`;

const TopSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
`;

const LevelInfo = styled.div`
  display: flex;
  align-items: end;
`;

const LevelLabel = styled.div`
  font-size: 22px;
  word-break: keep-all;
  font-weight: 700;
  margin-right: 8px;
`;

const NextLevel = styled.div`
  font-size: 12px;
  color: #a1a1aa;
  flex: auto;
  white-space: nowrap;
`;

const PercentValue = styled.div`
  font-size: 30px;
  color: ${COLOR.pastelGreen};
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 4px;
  background-color: #374151;
  border-radius: 2px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ progress: number; color: string }>`
  width: ${(props) => props.progress}%;
  height: 100%;
  background-color: ${(props) => props.color};
  transition: width 0.3s ease;
`;

const BottomSection = styled.div`
  display: flex;
  align-items: center;
`;

const LevelIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 35%;
  background-color: ${COLOR.violet};
  color: white;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  letter-spacing: 0.5px;
`;

const NextLevelInfo = styled.div`
  font-size: 10px;
  color: #d6d3d1;
`;

const NextLevelMoney = styled.span`
  font-size: 10px;
  color: ${COLOR.pastelViolet};
`;
