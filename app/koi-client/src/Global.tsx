import React, { useState, useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { useStorageState } from 'react-simplikit';
import { ConfigProvider } from 'antd';
import { QueryClientProvider } from 'lib-react-query';
import { useAtom } from 'jotai';
import { Session } from '@supabase/supabase-js';
import SupabaseProvider from './library/supabase/SupabaseProvider';
import { UserStore } from './store';
import { isBoothMode } from './utils/booth';
import { BoothProvider, useBoothContext } from './context/BoothContext';
import BoothModeEntry from './component/booth/BoothModeEntry';
import PartyNotFound from './component/booth/PartyNotFound';
import * as Query from './hook/query';
import BackofficePoll from './page/@backoffice@poll';
import Profile from './page/@profile';
import Party from './page/@party@[partyId]';
import Backoffice from './page/@backoffice';
import RoomsSearch from './page/@rooms@search';
import BackofficeParty from './page/@backoffice@party';
import NoSession from './component/NoSession';
import BackofficeStock from './page/@backoffice@stock';
import BackofficeScreen from './page/@backoffice@screen@[partyId]';
import BackofficeStockDetail from './page/@backoffice@stock@[stockId]';
import BackofficePartyDetailPage from './page/@backoffice@party@[partyId]';

const router = createBrowserRouter([
  {
    // 원래 파티 리스트 페이지가 있었는데, 대체되었습니다.
    // 폴더 명이 @rooms@search 로 되어있는데, @로 추후 변경 예정입니다.
    // 히스토리가 변경되어 임시로 @rooms@search 로 진행하였습니다.
    element: <RoomsSearch />,
    path: '/',
  },
  {
    element: <Party />,
    path: '/party/:partyId',
  },
  {
    element: <Profile />,
    path: '/profile',
  },
  {
    element: <Backoffice />,
    path: '/backoffice',
  },
  {
    element: <BackofficePoll />,
    path: '/backoffice/poll',
  },
  {
    element: <BackofficeParty />,
    path: '/backoffice/party',
  },
  {
    element: <BackofficePartyDetailPage />,
    path: '/backoffice/party/:partyId',
  },
  {
    element: <BackofficeStock />,
    path: '/backoffice/stock',
  },
  {
    element: <BackofficeStockDetail />,
    path: '/backoffice/stock/:stockId',
  },
  {
    element: <BackofficeScreen />,
    path: '/backoffice/screen/:partyId',
  },
]);

type BoothPendingJoin = {
  partyId: string;
  timestamp: number;
};

// Booth Mode App Component
const BoothModeApp: React.FC<{
  supabaseSession: Session | null;
  setSupabaseSession: (session: Session | null) => void;
}> = ({ supabaseSession, setSupabaseSession }) => {
  const { boothUser, loginAsGuest } = useBoothContext();
  const [showAccountLogin, setShowAccountLogin] = useState(false);
  const [boothPendingJoin, setBoothPendingJoin] = useStorageState<BoothPendingJoin>('BOOTH_PENDING_JOIN', {
    deserializer: (value) => JSON.parse(value),
    serializer: (value) => JSON.stringify(value),
  });

  // Extract party ID from URL
  const partyId = window.location.pathname.match(/\/party\/(.+)/)?.[1];

  // Check if party exists using the existing hook
  const { data: party, error } = Query.Party.useQueryParty(partyId, {
    refetchInterval: false, // Don't refetch for existence check
    retry: false, // Don't retry if party doesn't exist
  });

  // Handle joining party for booth users after reload
  const { mutateAsync: joinParty } = Query.Party.useJoinParty();

  const isGuest = boothUser?.isGuest;
  const supabaseUserId = supabaseSession?.user?.id;

  useEffect(() => {
    // Check for pending join after reload
    if (boothPendingJoin && isGuest && supabaseUserId) {
      try {
        // Check if this is a recent pending join (within 10 seconds)
        if (Date.now() - boothPendingJoin.timestamp < 10000) {
          // Join the party with the anonymous auth user ID
          joinParty({ partyId: boothPendingJoin.partyId, userId: supabaseUserId })
            .then(() => {
              console.log('Booth user joined party successfully');
              // Clear the pending join
              setBoothPendingJoin(undefined);
            })
            .catch((error) => {
              console.error('Failed to join party as booth user:', error);
              // Still clear the pending join to avoid infinite retries
              setBoothPendingJoin(undefined);
            });
        } else {
          // Clear stale pending join
          setBoothPendingJoin(undefined);
        }
      } catch (e) {
        console.error('Error parsing pending join:', e);
        setBoothPendingJoin(undefined);
      }
    }
  }, [boothPendingJoin, isGuest, joinParty, setBoothPendingJoin, supabaseUserId]);

  // Handle guest join
  const handleGuestJoin = async (nickname: string) => {
    try {
      await loginAsGuest(nickname);

      // Get the party ID from the URL to persist it
      const currentPartyId = window.location.pathname.match(/\/party\/(.+)/)?.[1];

      if (currentPartyId) {
        // Store the party ID and a flag to join after reload
        setBoothPendingJoin({
          partyId: currentPartyId,
          timestamp: Date.now(),
        });
      }

      // After successful anonymous auth, the auth state change will trigger a re-render
      // No need to manually reload
    } catch (error) {
      console.error('Failed to login as guest:', error);
    }
  };

  // Handle account login request
  const handleAccountLogin = () => {
    setShowAccountLogin(true);
  };

  // If user chose account login, show the normal auth flow
  if (showAccountLogin) {
    return (
      <SupabaseProvider
        supabaseSession={supabaseSession}
        setSupabaseSession={setSupabaseSession}
        noSessionComponent={<NoSession />}
      >
        <RouterProvider router={router} />
      </SupabaseProvider>
    );
  }

  // If booth user is logged in as guest, the anonymous auth session will be handled by Supabase
  // The auth state change listener in SupabaseProvider will handle the session

  // If authenticated with Supabase
  if (supabaseSession) {
    return (
      <SupabaseProvider
        supabaseSession={supabaseSession}
        setSupabaseSession={setSupabaseSession}
        noSessionComponent={<NoSession />}
      >
        <RouterProvider router={router} />
      </SupabaseProvider>
    );
  }

  // Show loading while checking party (only if we have a partyId)
  if (partyId && !party && !error) {
    return (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          fontSize: '24px',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        확인 중...
      </div>
    );
  }

  // If party doesn't exist or there's an error, show error page
  if (partyId && (error || (!party && error !== undefined))) {
    return <PartyNotFound />;
  }

  // Show booth mode entry
  return <BoothModeEntry onGuestJoin={handleGuestJoin} onAccountLogin={handleAccountLogin} />;
};

const Global: React.FC = () => {
  const [supabaseSession, setSupabaseSession] = useAtom(UserStore.supabaseSession);

  // Check if booth mode is enabled AND if we're on a party page
  const isPartyPage = window.location.pathname.startsWith('/party/');
  const boothModeEnabled = isBoothMode() && isPartyPage;

  return (
    <QueryClientProvider devtoolEnabled>
      <ConfigProvider
        theme={{
          components: {
            Modal: {
              contentBg: '#1f2028',
              headerBg: '#1f2028',
              titleColor: '#ffffff',
              titleFontSize: 18,
              zIndexPopupBase: 999,
            },
          },
          token: {
            colorIcon: '#A2A2A2',
            colorIconHover: '#888888',
            fontFamily: 'DungGeunMo',
          },
        }}
      >
        <SupabaseProvider
          supabaseSession={supabaseSession}
          setSupabaseSession={setSupabaseSession}
          noSessionComponent={boothModeEnabled ? undefined : <NoSession />}
        >
          <BoothProvider isBoothMode={boothModeEnabled}>
            {boothModeEnabled ? (
              <BoothModeApp supabaseSession={supabaseSession} setSupabaseSession={setSupabaseSession} />
            ) : (
              <RouterProvider router={router} />
            )}
          </BoothProvider>
        </SupabaseProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default Global;
