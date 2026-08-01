import styled from '@emotion/styled';
import type { PlayerGrade, StockUserSchema, StockSchema } from 'shared~type-stock';

type Props = {
  user: StockUserSchema;
  stock: StockSchema;
  idx: number;
};

/**
 * V2 등급 기본 정보
 * - whale (고래): 자산 상위 - 돈은 많지만 영향력 약함
 * - shrimp (새우): 자산 중위 - 평범한 영향력
 * - ant (개미): 자산 하위 - 돈은 없지만 영향력 강함
 */
const GRADE_INFO: Record<PlayerGrade, { emoji: string; label: string; color: string }> = {
  whale: {
    emoji: '🐋',
    label: '고래',
    color: '#3B82F6', // blue
  },
  shrimp: {
    emoji: '🦐',
    label: '새우',
    color: '#F97316', // orange
  },
  ant: {
    emoji: '🐜',
    label: '개미',
    color: '#EF4444', // red
  },
};

/**
 * 등급별 힌트 메시지 생성
 */
const getGradeHint = (grade: PlayerGrade): string => {
  switch (grade) {
    case 'whale':
      return '돈은 많지만 시장을 움직이는 힘이 약합니다';
    case 'shrimp':
      return '평범한 영향력입니다';
    case 'ant':
      return '돈은 없지만 시장을 뒤흔드는 강력한 힘!';
    default:
      return '';
  }
};

export const MyGrade = ({ user, stock, idx }: Props) => {
  const gradeConfig = stock.gradeConfig;

  // gradeConfig가 없으면 렌더링하지 않음
  if (!gradeConfig) {
    return null;
  }

  // 1라운드는 모두 새우 (서버에서 저장된 등급이 없을 수 있음)
  // 2라운드부터는 서버에서 저장된 user.grade 사용
  const grade: PlayerGrade = idx === 0 ? 'shrimp' : (user.grade ?? 'shrimp');
  const gradeInfo = GRADE_INFO[grade];
  const multiplier = gradeConfig.multipliers[grade];

  return (
    <Container>
      <LeftSection>
        <EmojiContainer color={gradeInfo.color}>{gradeInfo.emoji}</EmojiContainer>
      </LeftSection>
      <RightSection>
        <TopSection>
          <GradeLabel color={gradeInfo.color}>{gradeInfo.label}</GradeLabel>
          {idx === 0 && <GradeDescription>1라운드는 모두 새우</GradeDescription>}
        </TopSection>
        <BottomSection>
          <InfoText>거래 영향력 {multiplier}배</InfoText>
          <GradeHint>{getGradeHint(grade)}</GradeHint>
        </BottomSection>
      </RightSection>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  width: 100%;
  color: white;
  padding: 20px;
  gap: 16px;
  justify-content: flex-start;
  border-radius: 12px;
  box-sizing: border-box;
  background-color: #252836;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #374151;
`;

const LeftSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const EmojiContainer = styled.div<{ color: string }>`
  width: 64px;
  height: 64px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 40px;
  background-color: ${(props) => `${props.color}20`};
  border-radius: 50%;
  border: 2px solid ${(props) => props.color};
`;

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  gap: 8px;
`;

const TopSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const GradeLabel = styled.div<{ color: string }>`
  font-size: 24px;
  font-weight: 700;
  color: ${(props) => props.color};
`;

const GradeDescription = styled.div`
  font-size: 12px;
  color: #a1a1aa;
`;

const BottomSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoText = styled.div`
  font-size: 14px;
  color: #d6d3d1;
  font-weight: 500;
`;

const GradeHint = styled.div`
  font-size: 11px;
  color: #71717a;
`;
