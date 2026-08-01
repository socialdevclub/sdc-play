import styled from '@emotion/styled';
import { useState } from 'react';
import { getExternalBrowserUrl, getPlatform } from '../../utils/inAppBrowser';

const BYPASS_THRESHOLD = 10;

export default function InAppBrowserGuide() {
  const [tapCount, setTapCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const platform = getPlatform();

  const handleBypassTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= BYPASS_THRESHOLD) {
      localStorage.setItem('bypass-inapp-check', 'true');
      window.location.reload();
    }
  };

  const handleOpenExternalBrowser = () => {
    const url = getExternalBrowserUrl();
    window.location.href = url;
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 실패 시 fallback
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Container>
      <Content>
        <IconWrapper>
          <Icon>📱</Icon>
        </IconWrapper>

        <Title onClick={handleBypassTap}>외부 브라우저에서 열어주세요</Title>

        <Description>
          현재 앱 내 브라우저에서는
          <br />
          일부 기능이 제한될 수 있어요
        </Description>

        {platform === 'android' && (
          <ActionButton onClick={handleOpenExternalBrowser}>외부 브라우저로 열기</ActionButton>
        )}

        {platform === 'ios' && (
          <>
            <ActionButton onClick={handleCopyUrl}>{copied ? '복사됨!' : 'URL 복사하기'}</ActionButton>
            <GuideText>Safari 주소창에 붙여넣기 해주세요</GuideText>
          </>
        )}

        {platform === 'other' && (
          <>
            <ActionButton onClick={handleCopyUrl}>{copied ? '복사됨!' : 'URL 복사하기'}</ActionButton>
            <GuideText>브라우저 주소창에 붙여넣기 해주세요</GuideText>
          </>
        )}
      </Content>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(to bottom, #111827, #000000);
  padding: 20px;
  box-sizing: border-box;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 320px;
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 80px;
  height: 80px;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Icon = styled.span`
  font-size: 40px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0;
  cursor: default;
  user-select: none;
`;

const Description = styled.p`
  font-size: 16px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.6;
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GuideText = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;
