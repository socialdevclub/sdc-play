import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

interface SpinnerProps {
  size?: number;
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 20, color = 'white' }) => {
  return <SpinnerCircle size={size} color={color} />;
};

export default Spinner;

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const SpinnerCircle = styled.div<{ size: number; color: string }>`
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: ${(props) => props.color};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;
