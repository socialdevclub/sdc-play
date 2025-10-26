import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button } from 'antd';
import BoothNicknameModal from './BoothNicknameModal';

interface Props {
  onGuestJoin: (nickname: string) => Promise<void>;
  onAccountLogin: () => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const Card = styled.div`
  background: #1f2028;
  border-radius: 16px;
  padding: 40px 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const Title = styled.h1`
  font-size: 32px;
  color: #ffffff;
  text-align: center;
  margin-bottom: 8px;
  font-family: 'DungGeunMo', monospace;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #9ca3af;
  text-align: center;
  margin-bottom: 32px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PrimaryButton = styled(Button)`
  height: 56px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  background: #667eea;
  border: none;

  &:hover {
    background: #5a67d8 !important;
  }
`;

const SecondaryButton = styled(Button)`
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid #4a5568;
  color: #9ca3af;

  &:hover {
    border-color: #667eea !important;
    color: #667eea !important;
  }
`;

const BoothModeEntry: React.FC<Props> = ({ onGuestJoin, onAccountLogin }) => {
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);

  const handleGuestClick = () => {
    setIsNicknameModalOpen(true);
  };

  const handleNicknameSubmit = async (nickname: string) => {
    await onGuestJoin(nickname);
    setIsNicknameModalOpen(false);
  };

  const handleNicknameCancel = () => {
    setIsNicknameModalOpen(false);
  };

  return (
    <Container>
      <Card>
        <Title>SDC 부스 게임</Title>
        <Subtitle>실시간 주식 게임에 참여하세요!</Subtitle>

        <ButtonGroup>
          <div>
            <PrimaryButton type="primary" size="large" onClick={handleGuestClick} block>
              🎮 게스트로 참여
            </PrimaryButton>
          </div>

          <div>
            <SecondaryButton size="large" onClick={onAccountLogin} block>
              🔐 계정 로그인
            </SecondaryButton>
          </div>
        </ButtonGroup>
      </Card>

      <BoothNicknameModal
        isOpen={isNicknameModalOpen}
        onSubmit={handleNicknameSubmit}
        onCancel={handleNicknameCancel}
      />
    </Container>
  );
};

export default BoothModeEntry;
