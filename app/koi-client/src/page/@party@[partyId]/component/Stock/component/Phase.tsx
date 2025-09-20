import { SwitchCase } from '@toss/react';
import { useAtomValue } from 'jotai';
import ProfileSetter from './ProfileSetter';
import Waiting from './Waiting';
import AccessDenided from './AccessDenided';
import Stock from './Stock';
import Result from './Result';
import { Query } from '../../../../../hook';
import { UserStore } from '../../../../../store';
import Introduce from './Introduce';
import IntroduceResult from './IntroduceResult';

interface Props {
  stockId: string;
}

const Phase = ({ stockId }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);

  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: user } = Query.Stock.useUserFindOne(stockId, supabaseSession?.user.id);

  const stockPhase = stock?.stockPhase;
  const isEntry = Boolean(user);

  if (!supabaseSession || !stockPhase) {
    return <></>;
  }

  if (!isEntry && stockPhase !== 'CROWDING') {
    return <AccessDenided />;
  }

  return (
    <>
      <SwitchCase
        value={stockPhase}
        caseBy={{
          CROWDING: isEntry ? <Waiting stockId={stockId} /> : <ProfileSetter stockId={stockId} />,
          INTRO_INPUT: <Introduce stockId={stockId} />,
          INTRO_RESULT: <IntroduceResult stockId={stockId} />,
          PLAYING: <Stock stockId={stockId} />,
          RESULT: <Result stockId={stockId} />,
          WAITING: <Waiting stockId={stockId} />,
        }}
        defaultComponent={<Waiting />}
      />
    </>
  );
};

export default Phase;
