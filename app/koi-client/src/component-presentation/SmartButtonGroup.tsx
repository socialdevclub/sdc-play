import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { useState } from 'react';

export interface SmartButtonProps {
  text: string;
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  color?: string;
  backgroundColor?: string;
  flex?: number;
  loadingText?: string;
  successText?: string;
  successDuration?: number;
}

export interface SmartButtonGroupProps {
  buttons: SmartButtonProps[];
  direction?: 'row' | 'column';
  gap?: number;
  fullWidth?: boolean;
  padding?: string;
}

type ButtonState = 'idle' | 'loading' | 'success';

const spinKeyframes = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const checkKeyframes = keyframes`
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const SmartButton = ({
  text,
  onClick,
  disabled,
  color,
  backgroundColor,
  flex,
  loadingText = '처리 중...',
  successText = '완료!',
  successDuration = 1000,
  ...props
}: SmartButtonProps & { style?: React.CSSProperties; fullWidth?: boolean }) => {
  const [buttonState, setButtonState] = useState<ButtonState>('idle');

  const handleClick = async () => {
    if (disabled || buttonState !== 'idle') return;

    setButtonState('loading');

    try {
      await onClick();
      setButtonState('success');

      setTimeout(() => {
        setButtonState('idle');
      }, successDuration);
    } catch (error) {
      setButtonState('idle');
    }
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <ButtonContent>
            <Spinner />
            {loadingText}
          </ButtonContent>
        );
      case 'success':
        return (
          <ButtonContent>
            <CheckIcon>✓</CheckIcon>
            {successText}
          </ButtonContent>
        );
      default:
        return text;
    }
  };

  const getButtonColor = () => {
    switch (buttonState) {
      case 'loading':
        return '#6b7280';
      case 'success':
        return '#22c55e';
      default:
        return backgroundColor;
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || buttonState !== 'idle'}
      style={{
        backgroundColor: getButtonColor(),
        color,
        flex,
        ...props.style,
      }}
      fullWidth={props.fullWidth || false}
      buttonState={buttonState}
    >
      {getButtonContent()}
    </Button>
  );
};

const SmartButtonGroup = ({
  buttons,
  direction = 'row',
  gap = 8,
  fullWidth = true,
  padding = '16px',
}: SmartButtonGroupProps) => {
  return (
    <Container style={{ padding }}>
      <Flex direction={direction} gap={gap}>
        {buttons.map((button, index) => (
          <SmartButton successDuration={500} key={`${button.text}-${index}`} {...button} fullWidth={fullWidth} />
        ))}
      </Flex>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Flex = styled.div<{ direction: 'row' | 'column'; gap: number }>`
  width: 100%;
  display: flex;
  flex-direction: ${(props) => props.direction};
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.gap}px;
`;

const Button = styled.button<{ fullWidth: boolean; buttonState: ButtonState }>`
  width: ${(props) => (props.fullWidth ? '100%' : 'auto')};
  height: 48px;
  background-color: #374151;
  color: white;
  border-radius: 4px;
  border: none;
  font-family: DungGeunMo;
  font-size: 14px;
  line-height: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:disabled {
    opacity: ${({ buttonState }) => (buttonState === 'loading' ? 0.8 : 0.5)};
    cursor: ${({ buttonState }) => (buttonState === 'loading' ? 'wait' : 'not-allowed')};
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: ${spinKeyframes} 1s linear infinite;
`;

const CheckIcon = styled.span`
  font-size: 16px;
  font-weight: bold;
  animation: ${checkKeyframes} 0.3s ease-out;
`;

export default SmartButtonGroup;
