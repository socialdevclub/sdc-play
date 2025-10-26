import { useAtomValue } from 'jotai';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserStore } from '../store';
import { Query } from '../hook';

interface Props {
  children: React.ReactNode;
}

const ProfileValidator = ({ children }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const navigate = useNavigate();

  const { data, isFetching } = Query.Supabase.useMyProfile({ supabaseSession });
  const username = data?.data?.username;

  // Check if this is a booth guest user
  const isBoothGuest = supabaseSession?.user?.user_metadata?.isBoothGuest === true;

  useEffect(() => {
    // Skip validation for booth guests - they don't need profiles
    if (isBoothGuest) {
      return;
    }

    // For regular users, redirect to profile if no username
    if (!isFetching && !username) {
      navigate('/profile');
    }
  }, [isFetching, navigate, username, isBoothGuest]);

  return <>{children}</>;
};

export default ProfileValidator;
