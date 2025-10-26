import React from 'react';
import styled from '@emotion/styled';
import { Query } from '../../hook';
import { fetchProfileByUsername } from '../../hook/query/Supabase/useQueryProfileByUsername';
import { ControlButton, ControlButtonGroup } from '.';

interface UserListProps {
  stockId: string;
}

const UserList: React.FC<UserListProps> = ({ stockId }) => {
  const { data: stock } = Query.Stock.useQueryStock(stockId);
  const { data: users } = Query.Stock.useUserList(stockId);
  const { data: profiles } = Query.Supabase.useQueryProfileById(users?.map((v) => v.userId) ?? []);

  const introNotCompletedUsers = users?.filter((user) => !user.userInfo.introduction) ?? [];

  const { mutateAsync: mutateRemoveUser } = Query.Stock.useRemoveUser();
  const { mutateAsync: mutateRegisterUser } = Query.Stock.useRegisterUser();
  const { mutateAsync: mutateUserAlignIndex } = Query.Stock.useUserAlignIndex(stockId);

  return (
    <UserListContainer>
      <StyledInput
        placeholder="등록할 유저 닉네임"
        onKeyDown={async (event) => {
          if (event.key === 'Enter' && event.currentTarget.value) {
            const username = event.currentTarget.value;

            if (users?.find((v) => v.userInfo.nickname === username)) {
              alert('이미 참가자입니다.');
              return;
            }

            const profile = await fetchProfileByUsername([username]);

            if (!profile.data?.length) {
              alert('존재하지 않는 유저입니다.');
              return;
            }

            if (profile.data.length > 1) {
              alert('중복된 유저입니다.');
              return;
            }

            const profileData = profile.data[0];

            mutateRegisterUser({
              companyNames: Object.keys(stock?.companies ?? {}),
              stockId,
              stockStorages: [],
              userId: profileData.id,
              userInfo: {
                gender: profileData.gender,
                nickname: profileData.username,
              },
            });
          }
        }}
      />

      <ControlButtonGroup>
        <ControlButton
          onClick={() => {
            mutateUserAlignIndex({});
          }}
        >
          인덱스 정렬
        </ControlButton>
      </ControlButtonGroup>

      <UserStats>
        <StatItem>
          <StatLabel>참가자</StatLabel>
          <StatValue>{users?.length}명</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>자기소개 미완료</StatLabel>
          <StatValue>{introNotCompletedUsers.length}명</StatValue>
        </StatItem>
      </UserStats>

      <UserGridContainer>
        {users?.map((user) => (
          <UserCard key={user.userId}>
            <UserCardContent>
              <UserName>
                <UserIndex>{user.index}</UserIndex>
                {profiles?.data?.find((v) => v.id === user.userId)?.username || user.userInfo.nickname}
              </UserName>
              {!user.userInfo.introduction && <MissingIntro>자기소개 미작성</MissingIntro>}
            </UserCardContent>
            <RemoveButton
              onClick={() => {
                mutateRemoveUser({ stockId, userId: user.userId });
              }}
            >
              제거
            </RemoveButton>
          </UserCard>
        ))}
      </UserGridContainer>

      {introNotCompletedUsers.length > 0 && (
        <WarningSection>
          <WarningTitle>자기소개 미완료 사용자</WarningTitle>
          <WarningList>
            {introNotCompletedUsers.map((user) => (
              <WarningItem key={user.userId}>
                {profiles?.data?.find((v) => v.id === user.userId)?.username || user.userInfo.nickname}
              </WarningItem>
            ))}
          </WarningList>
        </WarningSection>
      )}
    </UserListContainer>
  );
};

export default UserList;

// 스타일 컴포넌트
const UserListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

const StyledInput = styled.input`
  padding: 0.8rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #5c6bc0;
    box-shadow: 0 0 0 3px rgba(92, 107, 192, 0.2);
  }

  &::placeholder {
    color: #aaa;
  }
`;

const UserStats = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  margin-top: 0.5rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background-color: #f5f7ff;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const StatLabel = styled.span`
  font-size: 0.9rem;
  color: #5c6bc0;
`;

const StatValue = styled.span`
  font-weight: 700;
  color: #3949ab;
  font-size: 1.1rem;
`;

const UserGridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.2rem;
  margin-top: 1rem;
`;

const UserCard = styled.div`
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    border-color: #c5cae9;
  }
`;

const UserCardContent = styled.div`
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #5c6bc0;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  flex-shrink: 0;
`;

const MissingIntro = styled.div`
  font-size: 0.75rem;
  background-color: #fff5f5;
  color: #ff6b6b;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  display: inline-block;
  font-weight: 500;
`;

const RemoveButton = styled.button`
  width: 100%;
  padding: 0.7rem;
  font-size: 0.85rem;
  background-color: #f8f9fa;
  border: none;
  border-top: 1px solid #eaeaea;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #495057;

  &:hover {
    background-color: #ff6b6b;
    color: white;
  }
`;

const WarningSection = styled.div`
  margin-top: 1.5rem;
  padding: 1.2rem;
  background-color: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255, 224, 130, 0.2);
`;

const WarningTitle = styled.div`
  font-weight: 700;
  font-size: 1rem;
  color: #f57c00;
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;

  &:before {
    content: '⚠️';
    margin-right: 0.5rem;
  }
`;

const WarningList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
`;

const WarningItem = styled.div`
  background-color: rgba(255, 224, 130, 0.4);
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #e65100;
  font-weight: 500;
`;
