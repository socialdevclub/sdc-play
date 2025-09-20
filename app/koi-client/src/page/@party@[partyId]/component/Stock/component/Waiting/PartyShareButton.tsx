import { MessageInstance } from 'antd/es/message/interface';
import React, { useCallback } from 'react';
import { Share } from 'lucide-react';
import { useAtomValue } from 'jotai/react';
import { ButtonContent, ButtonText, PurpleButton } from '.';
import { StockStore } from '../../store';

interface PartyShareButtonProps {
  messageApi: MessageInstance;
}

const PartyShareButton: React.FC<PartyShareButtonProps> = ({ messageApi }) => {
  const partyId = useAtomValue(StockStore.partyId);

  const shareParty = useCallback(() => {
    const url = `${window.location.origin}/party/${partyId}`;
    navigator.clipboard.writeText(url);
    messageApi.success({
      content: '링크가 복사되었습니다. 친구에게 공유해보세요!',
      duration: 2,
    });
  }, [messageApi, partyId]);

  return (
    <PurpleButton onClick={shareParty}>
      <ButtonContent>
        <Share color="white" />
        <ButtonText>공유하기</ButtonText>
      </ButtonContent>
    </PurpleButton>
  );
};

export default PartyShareButton;
