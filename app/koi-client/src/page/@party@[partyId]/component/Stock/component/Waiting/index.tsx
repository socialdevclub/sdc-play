import styled from '@emotion/styled';
import { useState } from 'react';
import { Info, Copy, ChevronRight, Settings, ChevronUp, ChevronDown, UsersRound, UserRound, Play } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { message, Switch, Dropdown } from 'antd';
import { useAtomValue } from 'jotai';
import { Query } from '../../../../../../hook';
import { UserStore } from '../../../../../../store';
import {
  fluctuationMenuItems,
  gameModeMenuItems,
  initialMoneyMenuItems,
  initialStockCountMenuItems,
  maxMarketStockCountMenuItems,
  maxPersonalStockCountMenuItems,
} from './constant';
import { 게임모드, 쀼머니게임_회사 } from '../../constant';

const STOCK_NAMES = [
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
] as [string, string, string, string, string, string, string, string, string, string];

const DALTO_NAMES = [
  '자동차',
  '에너지',
  '건설',
  '방산',
  '인공지능',
  '종합지수',
  '자동차 2배',
  '건설 2배',
  '방산 2배',
  '인공지능 2배',
] as [string, string, string, string, string, string, string, string, string, string];

interface Props {
  HeaderComponent?: JSX.Element;
  stockId?: string;
}

const Waiting = ({ HeaderComponent = <></>, stockId }: Props) => {
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isOpenGameOption, setIsOpenGameOption] = useState(false);
  const [maxMarketStockType, setMaxMarketStockType] = useState<string>('infinity');
  const [customMaxStock, setCustomMaxStock] = useState<string>('');
  const [maxPersonalStockType, setMaxPersonalStockType] = useState<string>('infinity');
  const [customMaxPersonalStock, setCustomMaxPersonalStock] = useState<string>('');
  const [v2InitialStockCount, setV2InitialStockCount] = useState<number>(5);
  const [gameOption, setGameOption] = useState({
    hasLoan: true,
    isTransaction: true,
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
    ] as [string, string, string, string, string, string, string, string, string, string],
  });

  const { partyId } = useParams();
  const [messageApi, messageContextHolder] = message.useMessage();

  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: userList } = Query.Stock.useUserList(stockId);
  const { data: party } = Query.Party.useQueryParty(partyId ?? '');
  const { mutateAsync: mutateAlignIndex } = Query.Stock.useUserAlignIndex(stockId);
  const { mutateAsync: mutateResetGame } = Query.Stock.useResetStock(stockId);
  const { mutateAsync: mutateInitStock } = Query.Stock.useInitStock(stockId);
  const { mutateAsync: mutateUpdateGame } = Query.Stock.useUpdateStock();
  const { mutateAsync: mutateUserInitialize } = Query.Stock.useUserInitialize(stockId);
  const supabaseSession = useAtomValue(UserStore.supabaseSession);

  const userId = supabaseSession?.user.id;
  const isHost = party?.authorId === userId;

  const copyRoomNumber = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(partyId ?? '');

      messageApi.success({
        content: '방 번호가 복사되었습니다.',
        duration: 2,
      });
    }
  };

  const openMoreGameOption = () => {
    setIsOpenGameOption(!isOpenGameOption);
  };

  const changeGameOption = (key: keyof typeof gameOption) => {
    // TODO: 옵션 변경 요청
    setGameOption((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStockNameChange = (index: number, value: string) => {
    const newStockNames = [...gameOption.stockNames];
    newStockNames[index] = value;
    setGameOption((prev) => ({
      ...prev,
      stockNames: newStockNames as [string, string, string, string, string, string, string, string, string, string],
    }));
  };

  const openWideScreen = () => {
    window.open(`${window.location.origin}/backoffice/screen/${partyId}`, '_blank');
  };

  const getMaxMarketStockCount = (): number => {
    if (maxMarketStockType === 'infinity') return Infinity;

    if (maxMarketStockType === 'custom') {
      const num = parseInt(customMaxStock, 10);
      return !isNaN(num) && num > 0 ? num : Infinity;
    }

    const match = maxMarketStockType.match(/player\*(\d+)/);
    if (match) {
      const count = (userList?.length ?? 0) * parseInt(match[1], 10);
      console.log('🚀 ~ getMaxMarketStockCount ~ count:', count);
      return count;
    }

    return Infinity;
  };

  const getMaxMarketStockLabel = (): string => {
    const found = maxMarketStockCountMenuItems?.find((item) => item?.key === maxMarketStockType);

    if (maxMarketStockType === 'custom') {
      const calculated = getMaxMarketStockCount();
      return calculated === Infinity ? '직접 입력' : `직접 입력 (${calculated}개)`;
    }

    if (maxMarketStockType !== 'infinity' && maxMarketStockType.startsWith('player*')) {
      const calculated = getMaxMarketStockCount();
      const text = found?.key || '';
      return `${text} (현재: ${calculated}개)`;
    }

    if (typeof found?.key !== 'string') {
      console.warn('found?.key is not a string', found?.key);
      return '무제한';
    }

    return found?.key;
  };

  const getMaxPersonalStockCount = (): number => {
    if (maxPersonalStockType === 'infinity') return Infinity;

    if (maxPersonalStockType === 'custom') {
      const num = parseInt(customMaxPersonalStock, 10);
      return !isNaN(num) && num > 0 ? num : Infinity;
    }

    const match = maxPersonalStockType.match(/player\*(\d+)/);
    if (match) {
      const count = (userList?.length ?? 0) * parseInt(match[1], 10);
      console.log('🚀 ~ getMaxPersonalStockCount ~ count:', count);
      return count;
    }

    return Infinity;
  };

  const getMaxPersonalStockLabel = (): string => {
    const found = maxPersonalStockCountMenuItems?.find((item) => item?.key === maxPersonalStockType);

    if (maxPersonalStockType === 'custom') {
      const calculated = getMaxPersonalStockCount();
      return calculated === Infinity ? '직접 입력' : `직접 입력 (${calculated}개)`;
    }

    if (maxPersonalStockType !== 'infinity' && maxPersonalStockType.startsWith('player*')) {
      const calculated = getMaxPersonalStockCount();
      const text = found?.key || '';
      return `${text} (현재: ${calculated}개)`;
    }

    if (typeof found?.key !== 'string') {
      return '무제한';
    }

    return found.key;
  };

  const startGame = async () => {
    if (!stockId || !stock) return;

    await mutateAlignIndex({});
    await mutateResetGame({});
    if (stock.gameMode === 게임모드.REALISM) {
      await mutateInitStock({
        companies: 쀼머니게임_회사,
        gameMode: stock.gameMode,
        isCustomCompanies: true,
        maxMarketStockCount: Infinity,
        maxStockHintCount: gameOption.maxStockHintCount,
      });
    } else if (stock.gameMode === 게임모드.STOCK) {
      const maxMarketStockCount = getMaxMarketStockCount();
      await mutateInitStock({
        gameMode: stock.gameMode,
        isCustomCompanies: false,
        maxMarketStockCount,
        maxStockHintCount: gameOption.maxStockHintCount,
        stockNames: gameOption.stockNames,
      });
    } else if (stock.gameMode === 게임모드.DALTO) {
      await mutateInitStock({
        gameMode: stock.gameMode,
        isCustomCompanies: false,
        maxMarketStockCount: Infinity,
        maxStockHintCount: 6,
        stockNames: gameOption.stockNames,
      });
    } else if (stock.gameMode === 게임모드.V2) {
      await mutateInitStock({
        gameMode: stock.gameMode,
        initialStockCount: v2InitialStockCount,
        isCustomCompanies: false,
        maxMarketStockCount: Infinity,
        maxStockHintCount: Infinity,
        stockNames: gameOption.stockNames,
      });
    }
    const maxPersonalStockCount = stock.gameMode === 게임모드.STOCK ? getMaxPersonalStockCount() : Infinity;
    await mutateUpdateGame({
      _id: stockId,
      fluctuationsInterval: stock.fluctuationsInterval,
      hasLoan: gameOption.hasLoan,
      isTransaction: gameOption.isTransaction,
      maxPersonalStockCount,
    });
    await mutateUserInitialize({});
  };

  if (!stockId) return <></>;

  return (
    <Container>
      {messageContextHolder}
      {HeaderComponent}
      <Seperater />
      <BodyContainer>
        <RoomInfoContainer>
          <Tab>
            <Info />
            <TabText>방 정보</TabText>
          </Tab>
          <RoomInfoBox>
            <RoomNumberSection onClick={copyRoomNumber}>
              <RoomText>방 번호: </RoomText>
              <RoomNumber>{partyId}</RoomNumber>
              <Copy />
            </RoomNumberSection>
          </RoomInfoBox>
          {isHost && (
            <>
              <WideScreenView onClick={openWideScreen}>
                <WideScreenText>주식 현황판 크게 보기</WideScreenText>
                <ChevronRight />
              </WideScreenView>
              <InfoText>
                PC화면이나 빔 프로젝터를 이용하면
                <br />더 몰입해서 즐길 수 있어요!
              </InfoText>
            </>
          )}
        </RoomInfoContainer>

        {isHost && (
          <GameTimeSection>
            <Tab>
              <Settings />
              <TabText>게임 설정</TabText>
            </Tab>
            <GameOptionContainer>
              <GameOption id="game-option-fluctuation-container">
                <GameOptionTitle>게임 시간</GameOptionTitle>
                <Dropdown
                  menu={{
                    inlineIndent: 10,
                    items: fluctuationMenuItems,
                    onClick: ({ key }) =>
                      mutateUpdateGame({
                        _id: stockId,
                        fluctuationsInterval: Number(key),
                      }),
                    style: gameOptionDropdownStyle,
                  }}
                  trigger={['click']}
                  getPopupContainer={() => document.getElementById('game-option-fluctuation-container')!}
                >
                  <GameOptionValue dark>
                    <GameOptionText>
                      {(() => {
                        const found = fluctuationMenuItems?.find(
                          (item) => Number(item?.key) === stock?.fluctuationsInterval,
                        );
                        if (found && 'label' in found) {
                          return found.label;
                        }
                        return null;
                      })()}
                    </GameOptionText>
                    {isTimeOpen ? <ChevronUp /> : <ChevronDown />}
                  </GameOptionValue>
                </Dropdown>
              </GameOption>
              {isOpenGameOption && (
                <>
                  <GameOption>
                    <GameOptionTitle>주식거래 바로시작</GameOptionTitle>
                    <GameOptionValue style={{ justifyContent: 'flex-end', paddingRight: '10px' }}>
                      <Switch
                        checked={gameOption.isTransaction}
                        onChange={() => changeGameOption('isTransaction')}
                        style={{ backgroundColor: gameOption.isTransaction ? '#6339E3' : '#030711' }}
                      />
                      <GameOptionText style={{ minWidth: '24px' }}>
                        {gameOption.isTransaction ? 'ON' : 'OFF'}
                      </GameOptionText>
                    </GameOptionValue>
                  </GameOption>
                  <GameOption>
                    <GameOptionTitle>대출 기능 활성화</GameOptionTitle>
                    <GameOptionValue style={{ justifyContent: 'flex-end', paddingRight: '10px' }}>
                      <Switch
                        checked={gameOption.hasLoan}
                        onChange={() => changeGameOption('hasLoan')}
                        style={{ backgroundColor: gameOption.hasLoan ? '#6339E3' : '#030711' }}
                      />
                      <GameOptionText style={{ minWidth: '24px' }}>{gameOption.hasLoan ? 'ON' : 'OFF'}</GameOptionText>
                    </GameOptionValue>
                  </GameOption>
                  <GameOption>
                    <GameOptionTitle>주식 정보 기능 여부</GameOptionTitle>
                    <GameOptionValue style={{ justifyContent: 'flex-end', paddingRight: '10px' }}>
                      <Switch
                        checked={gameOption.maxStockHintCount === Infinity}
                        onChange={() => {
                          if (gameOption.maxStockHintCount === Infinity) {
                            setGameOption((prev) => ({ ...prev, maxStockHintCount: 0 }));
                          } else {
                            setGameOption((prev) => ({ ...prev, maxStockHintCount: Infinity }));
                          }
                        }}
                        style={{ backgroundColor: gameOption.maxStockHintCount === Infinity ? '#6339E3' : '#030711' }}
                      />
                      <GameOptionText style={{ minWidth: '24px' }}>
                        {gameOption.maxStockHintCount === Infinity ? 'ON' : 'OFF'}
                      </GameOptionText>
                    </GameOptionValue>
                  </GameOption>
                  <GameOption id="game-option-game-mode-container">
                    <GameOptionTitle>게임 모드</GameOptionTitle>
                    <Dropdown
                      menu={{
                        inlineIndent: 10,
                        items: gameModeMenuItems,
                        onClick: ({ key }) => {
                          mutateUpdateGame({
                            _id: stockId,
                            gameMode: key as 게임모드,
                            initialMoney:
                              key === 게임모드.REALISM ? 100_000_000 : key === 게임모드.V2 ? 500_000 : 1_000_000,
                          });
                          if (key === 게임모드.REALISM) {
                            setGameOption((prev) => ({
                              ...prev,
                              hasLoan: false,
                              maxStockHintCount: 0,
                            }));
                          } else if (key === 게임모드.STOCK) {
                            setGameOption((prev) => ({
                              ...prev,
                              hasLoan: true,
                              maxStockHintCount: Infinity,
                              stockNames: STOCK_NAMES,
                            }));
                          } else if (key === 게임모드.DALTO) {
                            setGameOption((prev) => ({
                              ...prev,
                              hasLoan: false,
                              maxStockHintCount: 6,
                              stockNames: DALTO_NAMES,
                            }));
                          } else if (key === 게임모드.V2) {
                            setGameOption((prev) => ({
                              ...prev,
                              hasLoan: false,
                              maxStockHintCount: Infinity,
                              stockNames: STOCK_NAMES,
                            }));
                            setV2InitialStockCount(5);
                          }
                        },
                        style: gameOptionDropdownStyle,
                      }}
                      trigger={['click']}
                      getPopupContainer={() => document.getElementById('game-option-game-mode-container')!}
                    >
                      <GameOptionValue dark>
                        <GameOptionText>
                          {(() => {
                            const found = gameModeMenuItems?.find((item) => item?.key === stock?.gameMode);
                            if (found && 'label' in found) {
                              return found.label;
                            }
                            return null;
                          })()}
                        </GameOptionText>
                        <ChevronDown />
                      </GameOptionValue>
                    </Dropdown>
                  </GameOption>
                  <GameOption id="game-option-initial-money-container">
                    <GameOptionTitle>초기 자금</GameOptionTitle>
                    <Dropdown
                      menu={{
                        inlineIndent: 10,
                        items: initialMoneyMenuItems,
                        onClick: ({ key }) =>
                          mutateUpdateGame({
                            _id: stockId,
                            initialMoney: Number(key),
                          }),
                        style: gameOptionDropdownStyle,
                      }}
                      trigger={['click']}
                      getPopupContainer={() => document.getElementById('game-option-initial-money-container')!}
                    >
                      <GameOptionValue dark>
                        <GameOptionText>
                          {(() => {
                            const found = initialMoneyMenuItems?.find(
                              (item) => Number(item?.key) === stock?.initialMoney,
                            );
                            if (found && 'label' in found) {
                              return found.label;
                            }
                            return null;
                          })()}
                        </GameOptionText>
                        {isTimeOpen ? <ChevronUp /> : <ChevronDown />}
                      </GameOptionValue>
                    </Dropdown>
                  </GameOption>
                  {stock?.gameMode === 게임모드.V2 && (
                    <GameOption id="game-option-initial-stock-count-container">
                      <GameOptionTitle>초기 주식 제공</GameOptionTitle>
                      <Dropdown
                        menu={{
                          inlineIndent: 10,
                          items: initialStockCountMenuItems,
                          onClick: ({ key }) => setV2InitialStockCount(Number(key)),
                          style: gameOptionDropdownStyle,
                        }}
                        trigger={['click']}
                        getPopupContainer={() => document.getElementById('game-option-initial-stock-count-container')!}
                      >
                        <GameOptionValue dark>
                          <GameOptionText>
                            {(() => {
                              const found = initialStockCountMenuItems?.find(
                                (item) => Number(item?.key) === v2InitialStockCount,
                              );
                              if (found && 'label' in found) {
                                return found.label;
                              }
                              return `${v2InitialStockCount}주`;
                            })()}
                          </GameOptionText>
                          <ChevronDown />
                        </GameOptionValue>
                      </Dropdown>
                    </GameOption>
                  )}
                  {stock?.gameMode === 게임모드.STOCK && (
                    <>
                      <GameOption id="game-option-max-stock-container">
                        <GameOptionTitle>시장 주식 수량 제한</GameOptionTitle>
                        <Dropdown
                          menu={{
                            inlineIndent: 10,
                            items: maxMarketStockCountMenuItems,
                            onClick: ({ key }) => setMaxMarketStockType(key as string),
                            style: gameOptionDropdownStyle,
                          }}
                          trigger={['click']}
                          getPopupContainer={() => document.getElementById('game-option-max-stock-container')!}
                        >
                          <GameOptionValue dark>
                            <GameOptionText>{getMaxMarketStockLabel()}</GameOptionText>
                            <ChevronDown />
                          </GameOptionValue>
                        </Dropdown>
                      </GameOption>
                      {maxMarketStockType === 'custom' && (
                        <GameOption>
                          <StockNameInput
                            type="number"
                            value={customMaxStock}
                            onChange={(e) => setCustomMaxStock(e.target.value)}
                            placeholder="양의 정수 입력 (예: 100)"
                            min="1"
                            step="1"
                            style={{ marginTop: '0', width: '100%' }}
                          />
                        </GameOption>
                      )}
                      <GameOption id="game-option-max-personal-stock-container">
                        <GameOptionTitle>개인 주식 수량 제한</GameOptionTitle>
                        <Dropdown
                          menu={{
                            inlineIndent: 10,
                            items: maxPersonalStockCountMenuItems,
                            onClick: ({ key }) => setMaxPersonalStockType(key as string),
                            style: gameOptionDropdownStyle,
                          }}
                          trigger={['click']}
                          getPopupContainer={() => document.getElementById('game-option-max-personal-stock-container')!}
                        >
                          <GameOptionValue dark>
                            <GameOptionText>{getMaxPersonalStockLabel()}</GameOptionText>
                            <ChevronDown />
                          </GameOptionValue>
                        </Dropdown>
                      </GameOption>
                      {maxPersonalStockType === 'custom' && (
                        <GameOption>
                          <StockNameInput
                            type="number"
                            value={customMaxPersonalStock}
                            onChange={(e) => setCustomMaxPersonalStock(e.target.value)}
                            placeholder="종목당 최대 개수 (예: 10)"
                            min="1"
                            step="1"
                            style={{ marginTop: '0', width: '100%' }}
                          />
                        </GameOption>
                      )}
                    </>
                  )}
                  {(stock?.gameMode === 게임모드.STOCK || stock?.gameMode === 게임모드.DALTO) && (
                    <GameOption style={{ display: 'block', gap: '10px' }}>
                      <GameOptionTitle>종목명</GameOptionTitle>
                      <StockNameInputGrid>
                        {gameOption.stockNames.map((name, index) => (
                          <StockNameInput
                            key={name}
                            value={name}
                            onChange={(e) => handleStockNameChange(index, e.target.value)}
                            maxLength={6}
                          />
                        ))}
                      </StockNameInputGrid>
                    </GameOption>
                  )}
                  {/* <GameOption gap={34}>
                    <GameOptionTitle>정보 이어진 사람 공개</GameOptionTitle>
                    <GameOptionValue>
                      <Switch
                        checked={gameOption.isOpenInfo}
                        onChange={() => changeGameOption('isOpenInfo')}
                        style={{ backgroundColor: gameOption.isOpenInfo ? '#6339E3' : '#030711' }}
                      />
                      <GameOptionText>{gameOption.isOpenInfo ? 'ON' : 'OFF'}</GameOptionText>
                    </GameOptionValue>
                  </GameOption> */}
                </>
              )}
            </GameOptionContainer>
            <MoreText onClick={openMoreGameOption}>
              <span>{isOpenGameOption ? '접기' : '더보기'}</span>
            </MoreText>
          </GameTimeSection>
        )}

        <PlayerSection>
          <Tab>
            <UsersRound />
            <TabText>플레이어</TabText>
          </Tab>
          <PlayerList>
            {userList?.map((user) => (
              <Player key={user.userId}>
                <AvatarContainer isHost={user.userId === party?.authorId}>
                  <UserRound />
                </AvatarContainer>
                <PlayerName isHost={user.userId === party?.authorId}>{user.userInfo.nickname}</PlayerName>
              </Player>
            ))}
          </PlayerList>
        </PlayerSection>
      </BodyContainer>
      {isHost && (
        <BottomSheet>
          <ActionButtons>
            <PurpleButton onClick={startGame}>
              <ButtonContent>
                <Play color="white" />
                <ButtonText>게임시작</ButtonText>
              </ButtonContent>
            </PurpleButton>
          </ActionButtons>
        </BottomSheet>
      )}
    </Container>
  );
};

const gameOptionDropdownStyle: React.CSSProperties = {
  backgroundColor: '#030711',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '10px 12px',
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-bottom: 120px;
`;

const BodyContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 20px;
  padding-bottom: 0;
  gap: 40px;
  background-color: linear-gradient(to bottom, #111827, #000000);

  * {
    box-sizing: border-box;
  }
`;

const Seperater = styled.div`
  width: 100%;
  height: 1px;
  background-color: #1d283a;
`;

const RoomInfoContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 20px;
`;

const RoomInfoBox = styled.div`
  background-color: #252836;
  border-radius: 8px;
  width: 100%;
  padding: 18px;
  cursor: pointer;
`;

const RoomNumberSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  line-height: 135%;
`;

const RoomText = styled.div`
  font-size: 23px;
`;

const RoomNumber = styled.div`
  font-size: 28px;
  letter-spacing: 4px;
`;

const WideScreenView = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 14px 28px;
  border-radius: 8px;
  background-color: #007aff;
  gap: 10px;
  cursor: pointer;
`;

const Tab = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TabText = styled.div`
  font-size: 23px;
`;

const InfoText = styled.p`
  font-size: 14px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 10px;
`;

const GameTimeSection = styled.div`
  width: 100%;
`;

const GameOptionContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  margin-top: 20px;
  background-color: #252836;
  border-radius: 8px;
  gap: 16px;
`;

const GameOption = styled.div<{ gap?: number }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: ${(props) => (props.gap ? props.gap : 10)}px;

  .ant-dropdown-menu-item {
    padding: 0 !important;
  }
`;

const GameOptionTitle = styled.h2`
  font-size: 18px;
  line-height: 21.6px;
  word-break: keep-all;
`;

const GameOptionValue = styled.div<{ dark?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  padding-right: 2px;
  background-color: ${(props) => (props.dark ? '#030711' : undefined)};
  border: 1px solid #1d283a;
  border-radius: 8px;
  cursor: pointer;
  gap: 8px;
  flex-grow: 1;
`;

const GameOptionText = styled.div`
  font-size: 14px;
  line-height: 16.8px;
  word-break: keep-all;
`;

const MoreText = styled.div`
  margin: 12px 0 0 0;
  font-size: 14px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);

  > span {
    cursor: pointer;
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  }
`;

const WideScreenText = styled.div`
  font-size: 23px;
`;

const PlayerSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
`;

const PlayerList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  width: 100%;
  margin-top: 20px;
  padding: 12px 16px;
  background-color: #252836;
  border-radius: 8px;
  gap: 16px;
`;

const Player = styled.div<{ isHost?: boolean }>`
  display: flex;
  width: 48px;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
`;

const AvatarContainer = styled.div<{ isHost?: boolean }>`
  position: relative;
  width: 100%;
  height: 50px;
  border-radius: 50%;
  background-color: #4b5563;
  display: flex;
  justify-content: center;
  align-items: center;
  border: ${(props) => (props.isHost ? '1px solid #FFB643' : 'none')};
`;

const PlayerName = styled.div<{ isHost?: boolean }>`
  width: 90%;
  font-size: 12px;
  color: ${(props) => (props.isHost ? '#FFB643' : 'white')};
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
`;

const BottomSheet = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-top: 1px solid #1d283a;
  border-left: 1px solid #1d283a;
  border-right: 1px solid #1d283a;
  border-radius: 8px 8px 0 0;
  padding: 19px 0;
  background-color: #030711;
  z-index: 1051;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 14px;
  padding: 0 16px;
`;

const GrayButton = styled.button`
  width: 100%;
  background-color: #374151;
  border: none;
  border-radius: 8px;
  padding: 14px 24px 14px 16px;
  cursor: pointer;
`;

export const PurpleButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 14px 24px 14px 16px;
  background-color: #6339e3;
  cursor: pointer;
`;

export const ButtonContent = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
`;

export const ButtonText = styled.span`
  color: white;
  font-size: 22px;
  font-family: 'DungGeunMo', sans-serif;
  line-height: 135%;
`;

const StockNameInputGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
`;

const StockNameInput = styled.input`
  width: 100%;
  padding: 15px;
  background-color: #030711;
  border: 1px solid #1d283a;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

export default Waiting;
