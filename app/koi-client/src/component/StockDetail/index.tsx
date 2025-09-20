import styled from '@emotion/styled';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useInterval } from '@toss/react';
import { getDateDistance } from '@toss/date';
import dayjs from 'dayjs';
import { Query } from '../../hook';
import type { POV } from '../../type';
import UserList from './UserList';
import Table from './Table';
import RoundSetter from './RoundSetter';
import prependZero from '../../service/prependZero';

interface Props {
  stockId: string;
}

export default function StockDetail({ stockId }: Props) {
  const { mutateAsync: mutateUpdateGame } = Query.Stock.useUpdateStock();
  const { mutateAsync: mutateSetPhase } = Query.Stock.useSetPhase();
  const { mutateAsync: mutateInitStock } = Query.Stock.useInitStock(stockId);
  const { mutateAsync: mutateResetGame } = Query.Stock.useResetStock(stockId);
  const { mutateAsync: mutateBuyStock } = Query.Stock.useBuyStock();
  const { mutateAsync: mutateSellStock } = Query.Stock.useSellStock();
  const { mutateAsync: mutateFinishStock } = Query.Stock.useFinishStock(stockId);

  const { data: users } = Query.Stock.useUserList(stockId);
  const { data: stock } = Query.Stock.useQueryStock(stockId);

  const companies = stock?.companies ?? {};
  const companyNames = Object.keys(stock?.companies ?? {});
  const startedTime = dayjs(stock?.startedTime).toDate();
  const currentPriceIdx = Math.floor(
    getDateDistance(startedTime, new Date()).minutes / (stock?.fluctuationsInterval ?? 5),
  );

  const [selectedCompany, setSelectedCompany] = useState<string>(companyNames[0]);
  const [selectedUser, setSelectedUser] = useState<string>(users?.[0]?.userId ?? '');
  const [pov, setPov] = useState<POV>('player');

  // 경과된 시간
  const [elapsedTime, setElapsedTime] = useState<Date>(new Date(new Date().getTime() - startedTime.getTime()));

  // 사이드 패널 너비 상태 관리
  const [sidePanelWidth, setSidePanelWidth] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // 각 패널 섹션의 접기/펼치기 상태 관리
  const [usersCollapsed, setUsersCollapsed] = useState(false);
  const [roundSetterCollapsed, setRoundSetterCollapsed] = useState(false);
  const [gameSettingsCollapsed, setGameSettingsCollapsed] = useState(false);
  const [gameStateCollapsed, setGameStateCollapsed] = useState(false);
  const [gameControlsCollapsed, setGameControlsCollapsed] = useState(false);
  const [timeControlsCollapsed, setTimeControlsCollapsed] = useState(false);
  const [debuggingCollapsed, setDebuggingCollapsed] = useState(false);

  // 디버깅 거래 상태 관리
  const [tradeAmount, setTradeAmount] = useState(1);

  // 드래그 시작 핸들러
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 드래그 중 핸들러
  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !mainContentRef.current) return;

      const containerRect = mainContentRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      // 최소 너비와 최대 너비 제한
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.9;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      setSidePanelWidth(clampedWidth);
    },
    [isDragging],
  );

  // 마우스 이벤트 리스너 등록
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    } else {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  useInterval(
    () => {
      setElapsedTime(new Date(new Date().getTime() - startedTime.getTime()));
    },
    {
      delay: 1000,
    },
  );

  return (
    <StyledContainer>
      <StyledHeader>
        <HeaderTitle>주식 거래 시스템</HeaderTitle>
        <InfoContainer>
          <InfoItem>
            <InfoLabel>시작 시간:</InfoLabel>
            <InfoValue>
              {startedTime.toLocaleString('ko-KR', {
                hour12: false,
                timeZone: 'Asia/Seoul',
              })}
            </InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>경과 시간:</InfoLabel>
            <InfoValue data-testid="time-box">
              {`${prependZero(elapsedTime.getMinutes(), 2)}:${prependZero(elapsedTime.getSeconds(), 2)}`}
            </InfoValue>
          </InfoItem>
          <ViewToggle
            onClick={() => {
              setPov(pov === 'host' ? 'player' : 'host');
            }}
            isHost={pov === 'host'}
          >
            {pov === 'host' ? '호스트 시점' : '참가자 시점'}
          </ViewToggle>
        </InfoContainer>
      </StyledHeader>

      <MainContent ref={mainContentRef}>
        <SidePanel width={sidePanelWidth}>
          <PanelSection>
            <CollapsibleSectionTitle onClick={() => setUsersCollapsed(!usersCollapsed)} isCollapsed={usersCollapsed}>
              참가자 관리
              <CollapseIndicator isCollapsed={usersCollapsed} />
            </CollapsibleSectionTitle>
            {!usersCollapsed && <UserList stockId={stockId} />}
          </PanelSection>

          <PanelSection>
            <CollapsibleSectionTitle
              onClick={() => setRoundSetterCollapsed(!roundSetterCollapsed)}
              isCollapsed={roundSetterCollapsed}
            >
              라운드 설정
              <CollapseIndicator isCollapsed={roundSetterCollapsed} />
            </CollapsibleSectionTitle>
            {!roundSetterCollapsed && <RoundSetter stockId={stockId} />}
          </PanelSection>

          <PanelSection>
            <CollapsibleSectionTitle
              onClick={() => setGameSettingsCollapsed(!gameSettingsCollapsed)}
              isCollapsed={gameSettingsCollapsed}
            >
              게임 설정
              <CollapseIndicator isCollapsed={gameSettingsCollapsed} />
            </CollapsibleSectionTitle>
            {!gameSettingsCollapsed && (
              <ControlGroup>
                <StyledInput
                  placeholder={`시세변동주기 (${stock?.fluctuationsInterval}분)`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !!+event.currentTarget.value) {
                      mutateUpdateGame({
                        _id: stockId,
                        fluctuationsInterval: +event.currentTarget.value,
                      });
                    }
                  }}
                />
                <StyledInput
                  placeholder={`활동제한주기 (${stock?.transactionInterval}초)`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !isNaN(Number(event.currentTarget.value))) {
                      mutateUpdateGame({
                        _id: stockId,
                        transactionInterval: Number(event.currentTarget.value),
                      });
                    }
                  }}
                />
              </ControlGroup>
            )}
          </PanelSection>

          <PanelSection>
            <CollapsibleSectionTitle
              onClick={() => setGameStateCollapsed(!gameStateCollapsed)}
              isCollapsed={gameStateCollapsed}
            >
              게임 상태
              <CollapseIndicator isCollapsed={gameStateCollapsed} />
            </CollapsibleSectionTitle>
            {!gameStateCollapsed && (
              <PhaseButtonGroup>
                <PhaseButton
                  isActive={stock?.stockPhase === 'CROWDING'}
                  onClick={() => {
                    mutateSetPhase({ phase: 'CROWDING', stockId });
                  }}
                >
                  멤버 입장 대기
                </PhaseButton>
                <PhaseButton
                  isActive={stock?.stockPhase === 'WAITING'}
                  onClick={() => {
                    mutateSetPhase({ phase: 'WAITING', stockId });
                  }}
                >
                  게임 대기
                </PhaseButton>
                <PhaseButton
                  isActive={stock?.stockPhase === 'INTRO_INPUT'}
                  onClick={() => {
                    mutateSetPhase({ phase: 'INTRO_INPUT', stockId });
                  }}
                >
                  프로필 작성하기
                </PhaseButton>
                <PhaseButton
                  isActive={stock?.stockPhase === 'INTRO_RESULT'}
                  onClick={() => {
                    mutateSetPhase({ phase: 'INTRO_RESULT', stockId });
                  }}
                >
                  프로필 추리하기
                </PhaseButton>
                <PhaseButton
                  isActive={stock?.stockPhase === 'PLAYING'}
                  onClick={() => {
                    mutateSetPhase({ phase: 'PLAYING', stockId });
                  }}
                >
                  게임 중
                </PhaseButton>
                <PhaseButton
                  isActive={stock?.stockPhase === 'RESULT'}
                  onClick={() => {
                    mutateSetPhase({ phase: 'RESULT', stockId });
                  }}
                >
                  주식 결과
                </PhaseButton>
              </PhaseButtonGroup>
            )}
          </PanelSection>

          <PanelSection>
            <CollapsibleSectionTitle
              onClick={() => setGameControlsCollapsed(!gameControlsCollapsed)}
              isCollapsed={gameControlsCollapsed}
            >
              게임 제어
              <CollapseIndicator isCollapsed={gameControlsCollapsed} />
            </CollapsibleSectionTitle>
            {!gameControlsCollapsed && (
              <ControlButtonGroup>
                <ControlButton
                  onClick={() => {
                    mutateResetGame({});
                  }}
                  color="danger"
                >
                  게임 초기화
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    mutateInitStock({
                      isCustomCompanies: false,
                      maxMarketStockCount: Infinity,
                      maxStockHintCount: Infinity,
                      stockNames: [
                        '고양기획',
                        '꿀벌생명',
                        '늑대통신',
                        '멍멍제과',
                        '수달물산',
                        '여우은행',
                        '용용카드',
                        '토끼건설',
                        '햄찌금융',
                        '호랑전자',
                      ],
                    });
                  }}
                  color="warning"
                >
                  주식 초기화
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    mutateUpdateGame({
                      _id: stockId,
                      isTransaction: true,
                      startedTime: dayjs().toISOString(),
                    });
                  }}
                  color="success"
                >
                  시간 초기화 + 거래 활성화
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    mutateFinishStock({});
                  }}
                  color="primary"
                >
                  주식 종료 및 정산
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    mutateUpdateGame({
                      _id: stockId,
                      isTransaction: !stock?.isTransaction,
                    });
                  }}
                  isActive={stock?.isTransaction}
                >
                  거래 {stock?.isTransaction ? '비활성화' : '활성화'}
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    mutateUpdateGame({
                      _id: stockId,
                      isVisibleRank: !stock?.isVisibleRank,
                    });
                  }}
                  isActive={stock?.isVisibleRank}
                >
                  순위 {stock?.isVisibleRank ? '숨기기' : '공개'}
                </ControlButton>
              </ControlButtonGroup>
            )}
          </PanelSection>

          <PanelSection>
            <CollapsibleSectionTitle
              onClick={() => setTimeControlsCollapsed(!timeControlsCollapsed)}
              isCollapsed={timeControlsCollapsed}
            >
              경과 시간 제어
              <CollapseIndicator isCollapsed={timeControlsCollapsed} />
            </CollapsibleSectionTitle>
            {!timeControlsCollapsed && (
              <TimeControlGroup>
                <TimeButton
                  onClick={() => {
                    mutateUpdateGame({
                      _id: stockId,
                      startedTime: dayjs(startedTime).subtract(1, 'minute').toISOString(),
                    });
                  }}
                >
                  +1분
                </TimeButton>
                <TimeButton
                  onClick={() => {
                    mutateUpdateGame({
                      _id: stockId,
                      startedTime: dayjs(startedTime).subtract(10, 'second').toISOString(),
                    });
                  }}
                >
                  +10초
                </TimeButton>
                <TimeButton
                  onClick={() => {
                    mutateUpdateGame({
                      _id: stockId,
                      startedTime: dayjs(startedTime).add(10, 'second').toISOString(),
                    });
                  }}
                >
                  -10초
                </TimeButton>
                <TimeButton
                  onClick={() => {
                    mutateUpdateGame({
                      _id: stockId,
                      startedTime: dayjs(startedTime).add(1, 'minute').toISOString(),
                    });
                  }}
                >
                  -1분
                </TimeButton>
              </TimeControlGroup>
            )}
          </PanelSection>

          {stock && (
            <PanelSection>
              <CollapsibleSectionTitle
                onClick={() => setDebuggingCollapsed(!debuggingCollapsed)}
                isCollapsed={debuggingCollapsed}
              >
                디버깅 거래
                <CollapseIndicator isCollapsed={debuggingCollapsed} />
              </CollapsibleSectionTitle>
              {!debuggingCollapsed && (
                <DebugTradeContainer>
                  <DebugTradeRow>
                    <DebugTradeLabel>유저 선택:</DebugTradeLabel>
                    <UserSelect value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                      <option value="">유저 선택...</option>
                      {users?.map((user) => (
                        <option key={user.userId} value={user.userId}>
                          {user.userInfo.nickname || '익명'}
                        </option>
                      ))}
                    </UserSelect>
                  </DebugTradeRow>

                  <DebugTradeRow>
                    <DebugTradeLabel>회사 선택:</DebugTradeLabel>
                    <CompanySelect value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                      {companyNames.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </CompanySelect>
                  </DebugTradeRow>

                  <DebugTradeRow>
                    <DebugTradeLabel>거래 수량:</DebugTradeLabel>
                    <TradeAmountInput
                      type="number"
                      min="1"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(parseInt(e.target.value, 10) || 1)}
                    />
                  </DebugTradeRow>

                  <DebugTradeRow>
                    <DebugTradeLabel>현재 가격:</DebugTradeLabel>
                    <TradePrice>
                      {selectedCompany && companies[selectedCompany] && currentPriceIdx >= 0
                        ? `${companies[selectedCompany][currentPriceIdx]?.가격.toLocaleString()}원`
                        : '정보 없음'}
                    </TradePrice>
                  </DebugTradeRow>

                  <DebugTradeButtonGroup>
                    <BuyButton
                      disabled={!selectedUser || !selectedCompany}
                      onClick={() => {
                        if (!selectedUser || !selectedCompany || currentPriceIdx < 0) return;

                        mutateBuyStock({
                          amount: tradeAmount,
                          company: selectedCompany,
                          round: stock?.round,
                          stockId,
                          unitPrice: companies[selectedCompany][currentPriceIdx].가격,
                          userId: selectedUser,
                        });
                      }}
                    >
                      매수
                    </BuyButton>
                    <SellButton
                      disabled={!selectedUser || !selectedCompany}
                      onClick={() => {
                        if (!selectedUser || !selectedCompany || currentPriceIdx < 0) return;

                        mutateSellStock({
                          amount: tradeAmount,
                          company: selectedCompany,
                          round: stock.round,
                          stockId,
                          unitPrice: companies[selectedCompany][currentPriceIdx].가격,
                          userId: selectedUser,
                        });
                      }}
                    >
                      매도
                    </SellButton>
                  </DebugTradeButtonGroup>
                </DebugTradeContainer>
              )}
            </PanelSection>
          )}
        </SidePanel>

        <ResizeHandle onMouseDown={handleDragStart} isDragging={isDragging} />

        <MainPanel sideWidth={sidePanelWidth}>
          <Table stockId={stockId} elapsedTime={elapsedTime} pov={pov} />
        </MainPanel>
      </MainContent>
    </StyledContainer>
  );
}

// 스타일 컴포넌트
const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #f8f9fa;
  color: #333;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const StyledHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #4a4fbd 0%, #3f51b5 100%);
  color: white;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
`;

const InfoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoLabel = styled.span`
  font-weight: 500;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
`;

const InfoValue = styled.span`
  font-weight: 600;
  font-size: 0.9rem;
`;

const ViewToggle = styled.button<{ isHost: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  background-color: ${({ isHost }) => (isHost ? '#ff9800' : '#4caf50')};
  color: white;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  padding-bottom: 2rem;
`;

const SidePanel = styled.div<{ width: number }>`
  flex: 0 0 ${({ width }) => width}px;
  padding: 1rem;
  background-color: white;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  height: 100%;
  transition: flex 0.05s ease;
`;

const MainPanel = styled.div<{ sideWidth: number }>`
  flex: 1;
  padding: 1rem;
  overflow-x: auto;
  overflow-y: auto;
  height: 100%;
  max-width: calc(
    100vw - ${({ sideWidth }) => sideWidth + 8}px
  ); /* SidePanel 너비 + ResizeHandle 너비를 제외한 최대 너비 */
`;

const PanelSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  padding: 0 0 0.5rem 0;
  border-bottom: 2px solid #f0f0f0;
  color: #3f51b5;
`;

const CollapsibleSectionTitle = styled(SectionTitle)<{ isCollapsed: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0.5rem 0;
  margin-bottom: ${({ isCollapsed }) => (isCollapsed ? '0' : '0.5rem')};

  &:hover {
    background-color: #f5f5f5;
    padding-left: 0.5rem;
    border-radius: 4px;
  }
`;

const CollapseIndicator = styled.div<{ isCollapsed: boolean }>`
  width: 16px;
  height: 16px;
  position: relative;

  &:before,
  &:after {
    content: '';
    position: absolute;
    background-color: #3f51b5;
    transition: transform 0.2s ease;
  }

  &:before {
    top: 7px;
    left: 0;
    width: 100%;
    height: 2px;
  }

  &:after {
    top: 0;
    left: 7px;
    width: 2px;
    height: 100%;
    transform: ${({ isCollapsed }) => (isCollapsed ? 'none' : 'scaleY(0)')};
  }
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StyledInput = styled.input`
  padding: 0.6rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #3f51b5;
    box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.2);
  }

  &::placeholder {
    color: #aaa;
  }
`;

const PhaseButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
`;

const PhaseButton = styled.button<{ isActive?: boolean }>`
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  background-color: ${({ isActive }) => (isActive ? '#3f51b5' : '#e0e0e0')};
  color: ${({ isActive }) => (isActive ? 'white' : '#333')};

  &:hover {
    background-color: ${({ isActive }) => (isActive ? '#303f9f' : '#d5d5d5')};
    transform: translateY(-1px);
  }
`;

export const ControlButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const ControlButton = styled.button<{ isActive?: boolean; color?: string }>`
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  ${({ isActive, color }) => {
    if (isActive !== undefined) {
      return `
        background-color: ${isActive ? '#3f51b5' : '#e0e0e0'};
        color: ${isActive ? 'white' : '#333'};
        
        &:hover {
          background-color: ${isActive ? '#303f9f' : '#d5d5d5'};
        }
      `;
    }
    if (color) {
      const colorMap: Record<string, { bg: string; hover: string }> = {
        danger: { bg: '#f44336', hover: '#d32f2f' },
        info: { bg: '#2196f3', hover: '#1976d2' },
        primary: { bg: '#3f51b5', hover: '#303f9f' },
        success: { bg: '#4caf50', hover: '#3d8b40' },
        warning: { bg: '#ff9800', hover: '#f57c00' },
      };

      const colorObj = colorMap[color] || colorMap.primary;

      return `
        background-color: ${colorObj.bg};
        color: white;
        
        &:hover {
          background-color: ${colorObj.hover};
        }
      `;
    }

    return `
      background-color: #e0e0e0;
      color: #333;
      
      &:hover {
        background-color: #d5d5d5;
      }
    `;
  }}

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
`;

const TimeControlGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
`;

const TimeButton = styled.button`
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  background-color: #e0e0e0;
  color: #333;

  &:hover {
    background-color: #d5d5d5;
    transform: translateY(-1px);
  }
`;

const ResizeHandle = styled.div<{ isDragging: boolean }>`
  width: 8px;
  cursor: col-resize;
  height: 100%;
  background-color: ${({ isDragging }) => (isDragging ? '#3f51b5' : '#e0e0e0')};
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #bbdefb;
  }

  &:active {
    background-color: #3f51b5;
  }
`;

// 디버깅 거래 관련 스타일 추가
const DebugTradeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
`;

const DebugTradeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DebugTradeLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  width: 80px;
  flex-shrink: 0;
`;

const UserSelect = styled.select`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #3f51b5;
    box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.2);
  }
`;

const CompanySelect = styled(UserSelect)``;

const TradeAmountInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #3f51b5;
    box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.2);
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    opacity: 1;
  }
`;

const TradePrice = styled.div`
  flex: 1;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-weight: 600;
  color: #3f51b5;
`;

const DebugTradeButtonGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const BuyButton = styled.button`
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background-color: #4caf50;
  color: white;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #3d8b40;
    transform: translateY(-1px);
  }

  &:disabled {
    background-color: #e0e0e0;
    color: #9e9e9e;
    cursor: not-allowed;
  }
`;

const SellButton = styled.button`
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background-color: #f44336;
  color: white;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #d32f2f;
    transform: translateY(-1px);
  }

  &:disabled {
    background-color: #e0e0e0;
    color: #9e9e9e;
    cursor: not-allowed;
  }
`;
