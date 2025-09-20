import { useNavigate, useParams } from 'react-router-dom';
import { SwitchCase } from '@toss/react';
import { useEffect } from 'react';
import { Query } from '../../../hook';
import Poll from './Poll';
import Feed from './Feed';
import Stock from './Stock';
import { LOCAL_STORAGE_KEY } from '../../../config/localStorage';

const DefaultComponent = () => {
  return <center>환영합니다! 호스트의 지시를 따라주세요!</center>;
};

const Selector = () => {
  const { partyId } = useParams();
  const navigate = useNavigate();

  const { data: party, error } = Query.Party.useQueryParty(partyId ?? '', {
    retry: false,
    retryDelay: 0,
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching party data:', error);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/');
    }
  });

  if (!party?.activityName) {
    return <DefaultComponent />;
  }

  return (
    <SwitchCase
      value={party.activityId}
      caseBy={{
        FEED: <Feed party={party} />,
        POLL: <Poll />,
        STOCK: <Stock partyId={party._id} stockId={party.activityName} />,
      }}
      defaultComponent={<DefaultComponent />}
    />
  );
};

export default Selector;
