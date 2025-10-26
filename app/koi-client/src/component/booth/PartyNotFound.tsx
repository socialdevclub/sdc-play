import React from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
`;

const ErrorIcon = styled.div`
  font-size: 72px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 32px;
  margin-bottom: 16px;
  font-weight: bold;
`;

const Message = styled.p`
  font-size: 18px;
  margin-bottom: 32px;
  max-width: 400px;
  line-height: 1.5;
`;

const Button = styled.button`
  background: white;
  color: #667eea;
  border: none;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`;

const PartyNotFound: React.FC = () => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <Container>
      <ErrorIcon>🚫</ErrorIcon>
      <Title>파티를 찾을 수 없습니다</Title>
      <Message>
        요청하신 파티가 존재하지 않거나 종료되었습니다.
        <br />
        QR 코드를 다시 확인해주세요.
      </Message>
      <Button onClick={handleGoHome}>홈으로 돌아가기</Button>
    </Container>
  );
};

export default PartyNotFound;
