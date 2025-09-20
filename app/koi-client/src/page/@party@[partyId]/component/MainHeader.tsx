import { Space } from 'antd';
import { css } from '@linaria/core';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAtomValue } from 'jotai';
import Header from '../../../component-presentation/Header';
import ProfileValidator from '../../../component/ProfileValidator';
import { Query } from '../../../hook';
import RemainTimeClock from '../../../component-presentation/RemainTimeClock';
import useRoundTimeRaceCheck from '../../../hook/useRoundTimeRaceCheck.tsx';
import { UserStore } from '../../../store';
import { LOCAL_STORAGE_KEY } from '../../../config/localStorage';

const PartyHeader = () => {
  const { partyId } = useParams();
  const { data: party } = Query.Party.useQueryParty(partyId ?? '');
  const { data: stock, refetch } = Query.Stock.useQueryStock(party?.activityName ?? '');
  const supabaseSession = useAtomValue(UserStore.supabaseSession);

  const { remainingTime, roundTime } = useRoundTimeRaceCheck({ refetch, stock });
  const { mutateAsync: removeStock } = Query.Stock.useRemoveStockSession(stock?._id ?? ''); // 주식게임 방 세션 삭제
  const { mutateAsync: deleteParty } = Query.Party.useDeleteParty(partyId ?? ''); // 방 삭제

  const navigate = useNavigate();

  // 방 나가기 핸들러
  // @fixme: window.confirm을 컴포넌트로 대체
  async function handleExit() {
    if (window.confirm('정말 나가시겠습니까? 방이 삭제됩니다.')) {
      await removeStock({ stockId: stock?._id ?? '' });
      await deleteParty({ partyId: partyId ?? '' });
      // 로컬 스토리지에서 LOCAL_STORAGE_KEY 삭제
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/');
    }
  }

  const userId = supabaseSession?.user.id;
  const isHost = party?.authorId === userId;

  return (
    <ProfileValidator>
      <Header
        title={stock?.gameMode === 'realism' ? '쀼머니게임' : '주식게임'}
        LeftComponent={
          isHost && (
            <ChevronLeft
              size={32}
              onClick={() => handleExit()}
              className={css`
                color: white;
                flex-shrink: 0;

                &:hover {
                  cursor: pointer;
                }
              `}
            />
          )
        }
        RightComponent={
          <Space>
            {stock?.isTransaction && (
              <RemainTimeClock
                totalTime={roundTime} // 분 단위로 주어지기에, 60을 곱해서 초로 계산
                remainingTime={remainingTime} // 초 단위로 주어지기에, 60을 나누어서 분으로 계산
              />
            )}
          </Space>
        }
      />
      {/* {contextHolder} */}
    </ProfileValidator>
  );
};

export default PartyHeader;
