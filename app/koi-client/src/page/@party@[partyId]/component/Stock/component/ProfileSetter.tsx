import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { Query } from '../../../../../hook';
import { UserStore } from '../../../../../store';
import { useBoothContext } from '../../../../../context/BoothContext';

interface Props {
  stockId: string;
}

const ProfileSetter = ({ stockId }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const { boothUser } = useBoothContext();

  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: user } = Query.Supabase.useMyProfile({ supabaseSession });
  const { mutate, isIdle } = Query.Stock.useRegisterUser();

  // Check if this is a booth user
  const isBoothGuest = supabaseSession?.user?.user_metadata?.isBoothGuest === true;

  // Get user info based on whether it's a booth user or regular user
  const userId = isBoothGuest ? supabaseSession?.user?.id : user?.data?.id;
  const gender = isBoothGuest ? 'male' : user?.data?.gender; // Default gender for booth users
  const nickname = isBoothGuest ? boothUser?.nickname : user?.data?.username;

  useEffect(() => {
    if (!userId || !nickname) return;

    // For booth users, we don't require gender
    if (!isBoothGuest && !gender) return;

    if (isIdle) {
      mutate({
        companyNames: Object.keys(stock?.companies ?? {}),
        stockId,
        userId,
        userInfo: {
          gender: gender || 'male', // Fallback to 'male' if no gender
          nickname,
        },
      });
    }
  }, [gender, isIdle, mutate, nickname, stock?.companies, stockId, userId, isBoothGuest]);

  return <></>;
};

export default ProfileSetter;
