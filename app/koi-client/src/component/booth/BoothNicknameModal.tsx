import React, { useState, useEffect } from 'react';
import { Modal, Input, Form, message } from 'antd';
import styled from '@emotion/styled';
import { useParams } from 'react-router-dom';
import { useDebounce } from '@toss/react';
import { Query } from '../../hook';

interface Props {
  isOpen: boolean;
  onSubmit: (nickname: string) => Promise<void>;
  onCancel: () => void;
}

const StyledModal = styled(Modal)`
  .ant-modal-content {
    background: #1f2028;
    border-radius: 12px;
  }

  .ant-modal-header {
    background: #1f2028;
    border-bottom: 1px solid #2d3748;
  }

  .ant-modal-title {
    color: #ffffff;
    font-size: 20px;
    font-family: 'DungGeunMo', monospace;
  }

  .ant-modal-body {
    padding: 24px;
  }
`;

const FormItem = styled(Form.Item)`
  margin-bottom: 0;

  .ant-form-item-label > label {
    color: #9ca3af;
    font-size: 14px;
  }
`;

const StyledInput = styled(Input)`
  height: 48px;
  font-size: 16px;
  background: #2d3748;
  border: 1px solid #4a5568;
  color: #ffffff;

  &:hover,
  &:focus {
    border-color: #667eea;
    background: #2d3748;
  }

  &::placeholder {
    color: #718096;
  }
`;

const ValidationMessage = styled.div<{ type: 'success' | 'error' | 'loading' }>`
  margin-top: 8px;
  font-size: 14px;
  color: ${(props) => {
    switch (props.type) {
      case 'success':
        return '#48bb78';
      case 'error':
        return '#f56565';
      case 'loading':
        return '#718096';
      default:
        return '#718096';
    }
  }};
`;

const Instructions = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: #2d3748;
  border-radius: 8px;
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.5;
`;

const BoothNicknameModal: React.FC<Props> = ({ isOpen, onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const [nickname, setNickname] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  const { partyId } = useParams<{ partyId: string }>();

  // Use existing useQueryParty hook - only if we have a partyId
  const { data: party } = Query.Party.useQueryParty(partyId, {
    enabled: !!partyId && !!nickname && nickname.length >= 2,
    refetchInterval: 1000, // Poll for real-time updates
  });

  // Extract regular user IDs (non-booth users) from party
  const regularUserIds = party?.joinedUserIds || [];

  // Fetch profiles of regular users to get their nicknames
  const { data: userProfiles } = Query.Supabase.useQueryProfileById(regularUserIds);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setNickname('');
      setValidationMessage('');
    }
  }, [isOpen, form]);

  // Validate nickname
  const validateNickname = useDebounce((value: string) => {
    if (!value || value.length < 2) {
      setValidationMessage('닉네임은 2자 이상이어야 합니다.');
      return;
    }

    if (value.length > 20) {
      setValidationMessage('닉네임은 20자 이하여야 합니다.');
      return;
    }

    // Check for invalid characters
    const invalidCharPattern = /[^\w가-힣\s]/;
    if (invalidCharPattern.test(value)) {
      setValidationMessage('특수문자는 사용할 수 없습니다.');
      return;
    }

    // If no partyId (e.g., on root page), just validate the format
    if (!partyId) {
      setValidationMessage('✓ 사용 가능한 닉네임입니다.');
      return;
    }

    // If we have a partyId but party data isn't loaded yet
    if (!party) {
      setValidationMessage('확인 중...');
      return;
    }

    // Check if nickname is already taken in the party
    const normalizedValue = value.toLowerCase();

    // Check if it's taken by a regular user
    const takenByRegularUser =
      userProfiles?.data?.some((profile) => {
        // Compare nicknames case-insensitively
        return profile.username?.toLowerCase() === normalizedValue;
      }) || false;

    const isAvailable = !takenByRegularUser;

    setValidationMessage(isAvailable ? '✓ 사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.');
  }, 500);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setNickname(value);

    if (value) {
      setValidationMessage('확인 중...');
      validateNickname(value);
    } else {
      setValidationMessage('');
    }
  };

  const handleSubmit = async () => {
    if (!nickname) {
      message.error('닉네임을 입력해주세요.');
      return;
    }

    // If we have a partyId, check against the party data
    if (partyId && party) {
      const normalizedNickname = nickname.toLowerCase();

      // Check regular users
      const takenByRegularUser =
        userProfiles?.data?.some((profile) => {
          return profile.username?.toLowerCase() === normalizedNickname;
        }) || false;

      if (takenByRegularUser) {
        message.error('사용 가능한 닉네임을 입력해주세요.');
        return;
      }
    }

    // If no partyId or validation passed, submit
    try {
      await onSubmit(nickname);
    } catch (error) {
      message.error('로그인 중 오류가 발생했습니다.');
      console.error('Failed to submit nickname:', error);
    }
  };

  const getValidationType = (): 'success' | 'error' | 'loading' => {
    if (validationMessage === '확인 중...') return 'loading';
    if (validationMessage?.includes('✓')) return 'success';
    if (validationMessage) return 'error';
    return 'loading';
  };

  return (
    <StyledModal
      title="닉네임을 입력하세요"
      open={isOpen}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="확인"
      cancelText="취소"
      okButtonProps={{
        disabled: !nickname || !validationMessage?.includes('✓'),
        style: {
          background: validationMessage?.includes('✓') ? '#667eea' : undefined,
        },
      }}
      width={400}
      centered
    >
      <Instructions>💡 게임에서 사용할 닉네임을 입력해주세요.</Instructions>

      <Form form={form} layout="vertical">
        <FormItem
          label="닉네임"
          required
          validateStatus={nickname && !validationMessage?.includes('✓') ? 'error' : undefined}
        >
          <StyledInput
            placeholder="예: 홍길동, Player1"
            value={nickname}
            onChange={handleNicknameChange}
            maxLength={20}
            autoFocus
          />
          {validationMessage && <ValidationMessage type={getValidationType()}>{validationMessage}</ValidationMessage>}
        </FormItem>
      </Form>
    </StyledModal>
  );
};

export default BoothNicknameModal;
