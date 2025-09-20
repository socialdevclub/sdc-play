import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { Query } from '../../../../../hook';
import { UserStore } from '../../../../../store';

interface Props {
  stockId: string;
}

const ProfileSetter = ({ stockId }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);

  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: user } = Query.Supabase.useMyProfile({ supabaseSession });
  const { mutate, isIdle } = Query.Stock.useRegisterUser();

  const userId = user?.data?.id;
  const gender = user?.data?.gender;
  const nickname = user?.data?.username;

  useEffect(() => {
    if (!userId || !gender || !nickname) return;

    if (isIdle) {
      mutate({
        companyNames: Object.keys(stock?.companies ?? {}),
        stockId,
        userId,
        userInfo: {
          gender,
          nickname,
        },
      });
    }
  }, [gender, isIdle, mutate, nickname, stock?.companies, stockId, userId]);

  return <></>;
};

export default ProfileSetter;
