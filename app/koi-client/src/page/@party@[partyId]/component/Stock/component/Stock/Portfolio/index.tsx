import styled from '@emotion/styled';
import { MessageInstance } from 'antd/es/message/interface';
import { useStockInfo } from '../Home/hooks/useStockInfo';
import { StockHoldingsList } from '../Home/components/StockInfoList';

interface Props {
  stockId: string;
  messageApi: MessageInstance;
}

const Portfolio = ({ stockId, messageApi }: Props) => {
  const { stock, user, userId } = useStockInfo(stockId);

  if (!user || !stock || !userId) {
    return <LoadingContainer>포트폴리오를 불러오는 중...</LoadingContainer>;
  }
  return (
    <Container>
      {/* 보유 주식 목록 */}
      <StockHoldingsList stockId={stockId} userId={userId} messageApi={messageApi} />
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 16px;
  color: #9ca3af;
`;

const Divider = styled.div`
  height: 1px;
  background-color: #374151;
  margin: 0.5rem 0;
`;

export default Portfolio;
