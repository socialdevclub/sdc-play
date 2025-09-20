import styled from '@emotion/styled';
import type { MenuProps } from 'antd';

const DropdownItem = styled.div`
  width: 100%;
  border-radius: 8px;
  color: white;
`;

export const fluctuationMenuItems: MenuProps['items'] = [
  {
    key: '1',
    label: <DropdownItem>총 9분, 1분마다 주식 변동</DropdownItem>,
  },
  {
    key: '2',
    label: <DropdownItem>총 18분, 2분마다 주식 변동</DropdownItem>,
  },
  {
    key: '3',
    label: <DropdownItem>총 27분, 3분마다 주식 변동</DropdownItem>,
  },
  {
    key: '4',
    label: <DropdownItem>총 36분, 4분마다 주식 변동</DropdownItem>,
  },
  {
    key: '5',
    label: <DropdownItem>총 45분, 5분마다 주식 변동</DropdownItem>,
  },
];

export const initialMoneyMenuItems: MenuProps['items'] = [
  {
    key: 1_000_000,
    label: <DropdownItem>100만원</DropdownItem>,
  },
  {
    key: 10_000_000,
    label: <DropdownItem>1000만원</DropdownItem>,
  },
  {
    key: 100_000_000,
    label: <DropdownItem>1억원</DropdownItem>,
  },
];
