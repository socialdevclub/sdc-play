import styled from '@emotion/styled';
import { Avatar } from 'antd';
import saveAs from 'file-saver';
import html2canvas from 'html2canvas';
import { useAtomValue } from 'jotai';
import { AlignLeft, Bookmark, LogOut, Share } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// import { GetStockUser } from 'shared~type-stock/Response';
import { css } from '@emotion/react';
import { commaizeNumber } from '@toss/utils';
import { LOCAL_STORAGE_KEY } from '../../../../../../config/localStorage';
import { Query } from '../../../../../../hook';
import { UserStore } from '../../../../../../store';
import { formatPercentage } from '../../../../../../utils/stock';
import ResultRealism from './ResultRealism';
import { useBoothContext } from '../../../../../../context/BoothContext';

interface ResultProps {
  stockId: string;
}

// localStorage key for Instagram visit tracking
const INSTAGRAM_VISITED_KEY = 'sdc_instagram_visited';

function Result({ stockId }: ResultProps) {
  const { boothUser } = useBoothContext();
  const isGuestUser = boothUser?.isGuest;

  // State to track if user has visited Instagram
  const [hasVisitedInstagram, setHasVisitedInstagram] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const visited = localStorage.getItem(INSTAGRAM_VISITED_KEY);
    if (visited === 'true') {
      setHasVisitedInstagram(true);
    }
  }, []);

  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const { getRound0Avg, getRound12Avg } = Query.Stock.useQueryResult(stockId);

  const { partyId } = useParams();

  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: users } = Query.Stock.useUserList(stockId);
  const { data: party } = Query.Party.useQueryParty(partyId);

  const { mutateAsync: removeStock } = Query.Stock.useRemoveStockSession(stock?._id ?? ''); // 주식게임 방 세션 삭제
  // const { mutateAsync: removeStockUser } = Query.Stock.useRemoveUser(); // 주식게임 방 세션 유저 삭제
  const { mutateAsync: deleteParty } = Query.Party.useDeleteParty(partyId ?? ''); // 방 삭제
  const isHost = party?.authorId === supabaseSession?.user.id;

  const navigate = useNavigate();

  // 방 나가기 핸들러
  async function handleExit() {
    // 방장이면 방 삭제
    // @fixme: window.confirm을 컴포넌트로 대체
    if (isHost && window.confirm('정말 나가시겠습니까? 방이 삭제됩니다.')) {
      await removeStock({ stockId: stock?._id ?? '' });
      await deleteParty({ partyId: partyId ?? '' });
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/');
    } else if (!isHost) {
      // // 방장이 아니면 유저만 삭제
      // await removeStockUser({
      //   stockId: stock?._id ?? '',
      //   userId: supabaseSession?.user.id ?? '',
      // });
      // localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/');
    }
  }

  const captureAreaRef = useRef<HTMLDivElement>(null);

  if (!stock || !supabaseSession) {
    return <></>;
  }

  const userId = supabaseSession.user.id;
  const getRoundAvg = stock.round === 0 ? getRound0Avg : getRound12Avg;
  const roundAvg = getRoundAvg(userId);
  const fluctuation = roundAvg - stock.initialMoney;
  const percentage = formatPercentage(fluctuation / stock.initialMoney);

  if (!users) {
    return <></>;
  }

  const sortedUser = users ? [...users].sort((a, b) => getRoundAvg(b.userId) - getRoundAvg(a.userId)) : [];
  const rank = sortedUser.findIndex((v) => v.userId === userId) + 1;
  const user = sortedUser.find((v) => v.userId === userId);
  const rankPercentage = Math.floor(Math.max(((rank - 1) / sortedUser.length) * 100, 1));

  const animal =
    percentage < 0
      ? 'hamster'
      : percentage < 100
      ? 'rabbit'
      : percentage < 150
      ? 'cat'
      : percentage < 200
      ? 'dog'
      : percentage < 250
      ? 'wolf'
      : percentage < 300
      ? 'tiger'
      : 'dragon';

  const animalResult =
    animal === 'hamster'
      ? '당돌한 햄스터'
      : animal === 'rabbit'
      ? '순수한 토끼'
      : animal === 'cat'
      ? '세련된 고양이'
      : animal === 'dog'
      ? '활발한 강아지'
      : animal === 'wolf'
      ? '카리스마 늑대'
      : animal === 'tiger'
      ? '타고난 호랑이'
      : '전설적인 드래곤';

  const animalDescription =
    animal === 'hamster'
      ? '겉보기와 달리 대담하고 당돌한 매력을 가진 햄스터예요. 때로는 장난스럽게 속이고 때로는 예측불가한 행동으로 게임의 재미를 한층 더해주는 빌런이에요.'
      : animal === 'rabbit'
      ? '순수하고 친근한 매력으로 주변 사람들과 쉽게 어울리는 토끼예요. 밝은 에너지가 매력적이에요.'
      : animal === 'cat'
      ? '세련된 매력과 독특한 개성으로 사람들의 시선을 사로잡는 고양이예요. 묘한 매력을 풍기며 관심을 끌어요.'
      : animal === 'dog'
      ? '누구와도 잘 어울리고 밝은 에너지로 분위기를 이끄는 강아지예요. 많은 사람들이 함께하고 싶어해요.'
      : animal === 'wolf'
      ? '강한 카리스마와 직관력으로 상대방의 진심을 꿰뚫어보는 늑대예요. 신뢰할 수 있는 파트너가 되어줘요.'
      : animal === 'tiger'
      ? '타고난 리더십으로 팀을 이끌고 신뢰를 쌓아가는 호랑이예요. 함께하면 더 큰 시너지를 만들어낼 수 있어요.'
      : '전설적인 케미의 드래곤이예요. 뛰어난 통찰력과 매력으로 모든 이의 마음을 사로잡고 최고의 팀워크를 만들어요.';

  const handleDownload = async () => {
    if (!captureAreaRef.current) return;

    try {
      const div = captureAreaRef.current;
      div.style.backgroundImage = 'url(/background.jpg)';
      const canvas = await html2canvas(div);
      canvas.toBlob((blob) => {
        if (blob !== null) {
          saveAs(blob, 'result.png');
        }
      });
    } catch (error) {
      console.error('Error converting div to image:', error);
    } finally {
      if (captureAreaRef.current) {
        captureAreaRef.current.style.backgroundImage = '';
      }
    }
  };

  if (!user) {
    return <></>;
  }

  const shareData = {
    text: `${user.userInfo.nickname}님의 순위는 ${rank}위! ${animalResult}입니다! `,
    title: '주식게임결과',
    url: 'https://play.socialdev.club?share=stock',
  };

  const handleShare = async () => {
    try {
      await navigator.share(shareData);
      console.log('Share was successful.');
    } catch (error) {
      console.log('Sharing failed', error);
    }
  };

  // Handle Instagram visit
  const handleInstagramVisit = () => {
    // Open Instagram in new tab
    window.open('https://www.instagram.com/socialdev.club', '_blank', 'noopener,noreferrer');

    // Save visit status to localStorage
    localStorage.setItem(INSTAGRAM_VISITED_KEY, 'true');

    // Update state to show results
    setHasVisitedInstagram(true);
  };

  // Show Instagram prompt only for guest users who haven't visited yet
  if (isGuestUser && !hasVisitedInstagram) {
    return (
      <Container>
        <div css={css`
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          overflow: hidden;
        `}>
          <div css={css`
            position: relative;
            z-index: 2;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 40px 32px;
            box-shadow:
              0 20px 60px rgba(0, 0, 0, 0.1),
              0 8px 30px rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            width: 100%;
            text-align: center;
            transform: translateY(0);
            animation: slideInUp 0.8s ease-out;

            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}>
            {/* Trophy Icon */}
            <div css={css`
              margin-bottom: 20px;
              font-size: 48px;
              animation: bounce 2s infinite;

              @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
              }
            `}>
              🏆
            </div>

            {/* Main Title */}
            <h2 css={css`
              font-size: 24px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 12px;
              line-height: 1.3;
            `}>
              인스타 방문하고<br/>
              <span css={css`
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              `}>
                결과 확인하기!
              </span>
            </h2>

            {/* Subtitle */}
            <p css={css`
              font-size: 16px;
              color: #666;
              margin-bottom: 24px;
              line-height: 1.5;
            `}>
              소셜데브클럽 인스타그램 팔로우하기
            </p>

            {/* CTA Button */}
            <button
              css={css`
                width: 100%;
                padding: 18px 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 16px;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                box-shadow:
                  0 8px 24px rgba(102, 126, 234, 0.4),
                  0 4px 12px rgba(118, 75, 162, 0.3);
                transform: translateY(0);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

                &::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: -100%;
                  width: 100%;
                  height: 100%;
                  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                  transition: left 0.6s;
                }
              `}
              onClick={handleInstagramVisit}
            >
              <span css={css`
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              `}>
                인스타그램 팔로우하고 결과 확인
              </span>
            </button>

            {/* Security Note */}
            <p css={css`
              font-size: 12px;
              color: #999;
              margin-top: 16px;
              line-height: 1.4;
            `}>
              새 창에서 열리며, 개인정보는 수집되지 않습니다
            </p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {stock.gameMode !== 'realism' && (
        <>
          <CaptureArea ref={captureAreaRef}>
            <Title>주식게임 결과</Title>
            <Wrapper>
              <Box>
                <BoxContainer>
                  <TitleContainer>
                    <Name>{animalResult}</Name>
                  </TitleContainer>
                  <AnimalImg src={`/animal/${animal}.jpg`} />
                  <Text>{animalDescription}</Text>
                  <Text>
                    순수익 : {commaizeNumber(fluctuation)}원 ({percentage.toFixed(2)}%)
                  </Text>
                  <Text>
                    랭킹 : {rank}위 (상위 {rankPercentage}%)
                  </Text>
                </BoxContainer>
              </Box>
            </Wrapper>
          </CaptureArea>
          <Button
            css={css`
              margin-bottom: 35px;
            `}
            color="#9333EA"
            onClick={() => handleDownload()}
          >
            <Label>이미지 저장</Label>
          </Button>

          <SubTitle>
            <Bookmark size={24} />
            <span>내 순위</span>
          </SubTitle>

          <RankCard color={getRankColor(rank)}>
            <Rank>{rank}</Rank>
            <Avatar size={50} style={{ flexShrink: 0 }}>
              {user?.userInfo.nickname[0]}
            </Avatar>
            <Column align="flex-start">
              <Nickname>{getRankNickname(rank, user?.userInfo.nickname)}</Nickname>
              <AnimalName>{animalResult}</AnimalName>
            </Column>
            <Column align="flex-end">
              <Percentage percent={percentage}>
                {percentage >= 0 ? '+' : ''}
                {percentage}%
              </Percentage>
              <Avg>{roundAvg.toLocaleString()}원</Avg>
            </Column>
          </RankCard>

          <SubTitle>
            <AlignLeft size={24} />
            <span>전체 순위</span>
          </SubTitle>
          {sortedUser.map((user, index) => {
            const userAvg = getRoundAvg(user.userId);
            const userFluctuation = userAvg - stock.initialMoney;
            const userPercentage = formatPercentage(userFluctuation / stock.initialMoney);
            const animalResult = getAnimalByPercentage(userPercentage);

            return (
              <RankCard key={user.userId} color={getRankColor(index + 1)}>
                <Rank>{index + 1}</Rank>
                <Avatar size={50} style={{ flexShrink: 0 }}>
                  {user.userInfo.nickname[0]}
                </Avatar>
                <Column align="flex-start">
                  <Nickname>{getRankNickname(index + 1, user.userInfo.nickname)}</Nickname>
                  <AnimalName>{animalResult}</AnimalName>
                </Column>
                <Column align="flex-end">
                  <Percentage percent={userPercentage}>
                    {userPercentage >= 0 ? '+' : ''}
                    {userPercentage}%
                  </Percentage>
                  <Avg>{userAvg.toLocaleString()}원</Avg>
                </Column>
              </RankCard>
            );
          })}
        </>
      )}

      {stock.gameMode === 'realism' && <ResultRealism stock={stock} user={user} />}

      {stock.gameMode === 'stock' && (
        <BottomSection>
          {/*
            <Button color="#374151" onClick={handleShare}>
            <Share size={24} />
            <Label>공유하기</Label>
            </Button>
            */}
          <Button color="#F63C6B" onClick={() => handleExit()}>
            <LogOut size={24} />
            <Label>나가기</Label>
          </Button>
        </BottomSection>
      )}
    </Container>
  );
}

export default Result;

const RankColorCode = {
  bronze: '205, 127, 50',
  default: '37, 40, 54',
  gold: '213, 161, 30',
  silver: '163, 163, 163',
};

function getRankColor(rank: number) {
  switch (rank) {
    case 1:
      return RankColorCode.gold;
    case 2:
      return RankColorCode.silver;
    case 3:
      return RankColorCode.bronze;
    default:
      return RankColorCode.default;
  }
}

function getRankNickname(rank: number, nickname: string | undefined) {
  switch (rank) {
    case 1:
      return `🥇${nickname}`;
    case 2:
      return `🥈${nickname}`;
    case 3:
      return `🥉${nickname}`;
    default:
      return nickname;
  }
}

function getAnimalByPercentage(percentage: number) {
  if (percentage < 0) return '당돌한 햄스터';
  if (percentage < 100) return '순수한 토끼';
  if (percentage < 150) return '세련된 고양이';
  if (percentage < 200) return '활발한 강아지';
  if (percentage < 250) return '카리스마 늑대';
  if (percentage < 300) return '타고난 호랑이';
  return '전설적인 드래곤';
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100% !important;
  height: 100%;
  gap: 20px;
  padding: 0 16px;
  box-sizing: border-box;
  margin-bottom: 100px;

  @media (max-width: 405px) {
    max-width: 375px;
  }
`;

const SubTitle = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
  gap: 10px;
  font-size: 23px;
  line-height: 135%;
`;

const RankCard = styled.div<{ color: string }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 82px;
  background: ${({ color }) => `rgba(${color}, 0.2)`};
  border-radius: 8px;
  padding: 16px;
  border: 2px solid ${({ color }) => `rgb(${color})`};
  box-sizing: border-box;
  gap: 12px;
`;

const Column = styled.div<{ align: string }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ align }) => align};
  justify-content: center;
  width: 120px;
  gap: 6px;
`;

const Rank = styled.span`
  font-size: 24px;
`;

const Nickname = styled.span`
  font-size: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AnimalName = styled.span`
  font-size: 12px;
`;

const Percentage = styled.span<{ percent: number }>`
  font-size: 25px;
  color: ${({ percent }) => (percent >= 0 ? '#F87171' : '#60A5FA')};
`;

const Avg = styled.span`
  font-size: 12px;
`;

const BottomSection = styled.div`
  display: flex;
  position: absolute;
  bottom: 0;
  left: 0;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  border-top: 1px solid #1d283a;
  background-color: #1d283a;
  border-radius: 8px 8px 0 0;
  gap: 16px;
`;

const Button = styled.button<{ color: string }>`
  background-color: ${({ color }) => color};
  height: 60px;
  font-size: 23px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  width: 100%;
  gap: 10px;
  color: white;
  border: none;
  cursor: pointer;
  padding: 14px;
`;

const Label = styled.span`
  font-size: 23px;
  color: white;
  font-family: 'DungGeunMo';
  white-space: nowrap;
`;

const CaptureArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  width: 100%;
  box-sizing: border-box;
  padding: 35px;
`;

const Box = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;

  box-shadow: 5px 5px #000000;
  background-color: #000084;
`;

const BoxContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 50px 0;
  gap: 16px;
`;

const AnimalImg = styled.img`
  width: 250px;
  height: 250px;
  margin: 16px;
`;

const Text = styled.div`
  width: 250px;
  text-align: center;
  word-break: keep-all;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const Title = styled.div`
  margin-top: 35px;

  font-size: larger;
  text-shadow: 2px 2px #8461f8;
`;

const Name = styled.div`
  font-size: xx-large;
`;
