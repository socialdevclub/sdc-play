import { StockConfig } from 'shared~config';
import React, { useState } from 'react';
import styled from '@emotion/styled';
import { commaizeNumber } from '@toss/utils';
import { Query } from '../../hook';
import { POV } from '../../type';
import prependZero from '../../service/prependZero';

interface Props {
  elapsedTime: Date;
  pov: POV;
  stockId: string;
}

const Table = ({ elapsedTime, pov, stockId }: Props) => {
  const { data: game } = Query.Stock.useQueryStock(stockId);
  const { data: users } = Query.Stock.useUserList(stockId);
  const { data: profiles } = Query.Supabase.useQueryProfileById(users?.map((v) => v.userId) ?? []);
  const { data: results } = Query.Stock.useQueryResultList(stockId);

  // 주식 가치 계산을 위한 훅 추가
  const { allUserSellPriceDesc } = Query.Stock.useAllUserSellPriceDesc(stockId);

  // 각 테이블의 접기/펼치기 상태 관리
  const [firstPriceTableCollapsed, setFirstPriceTableCollapsed] = useState(false);
  const [secondPriceTableCollapsed, setSecondPriceTableCollapsed] = useState(false);
  const [remainingStocksCollapsed, setRemainingStocksCollapsed] = useState(false);
  const [moneyStatusCollapsed, setMoneyStatusCollapsed] = useState(false);
  const [roundResultsCollapsed, setRoundResultsCollapsed] = useState(false);

  if (!game?.companies) {
    return <></>;
  }

  const { companies, remainingStocks } = game;
  const companyNames = Object.keys(companies) as StockConfig.CompanyNames[];

  // 각 유저별 주식 가치 맵 생성
  const userStockValueMap = allUserSellPriceDesc().reduce((acc, { userId, allSellPrice }) => {
    acc[userId] = allSellPrice;
    return acc;
  }, {} as Record<string, number>);

  // 주식 가치를 포함한 총 자산 기준으로 유저 정렬
  const sortedUsers =
    [...(users ?? [])].sort((a, b) => {
      const aTotalValue = a.money + (userStockValueMap[a.userId] || 0);
      const bTotalValue = b.money + (userStockValueMap[b.userId] || 0);
      return bTotalValue - aTotalValue;
    }) || [];

  // 회사 이름을 5개씩 2개 그룹으로 분할
  const firstHalfCompanies = companyNames.slice(0, Math.ceil(companyNames.length / 2));
  const secondHalfCompanies = companyNames.slice(Math.ceil(companyNames.length / 2));

  // 공통 테이블 렌더링 함수 - 시세 현황용
  const renderPriceTable = (
    companyList: StockConfig.CompanyNames[],
    isCollapsed: boolean,
    setCollapsed: React.Dispatch<React.SetStateAction<boolean>>,
  ) => (
    <TableContainer>
      <CollapsibleTableTitle onClick={() => setCollapsed(!isCollapsed)} isCollapsed={isCollapsed}>
        시세 현황 ({companyList.join(', ')})
        <CollapseIndicator isCollapsed={isCollapsed} />
      </CollapsibleTableTitle>

      {!isCollapsed && (
        <StyledTable>
          <thead>
            <tr>
              <StyledTh rowSpan={2}>게임시각</StyledTh>
              {companyList.map((company) => (
                <StyledTh colSpan={3} key={company} isCompany>
                  {company}
                </StyledTh>
              ))}
            </tr>
            <tr>
              {companyList.map((company) => (
                <React.Fragment key={company}>
                  <StyledTh>등락</StyledTh>
                  <StyledTh>가격</StyledTh>
                  <StyledTh>정보</StyledTh>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, idx) => {
              return (
                <StyledTr key={idx} isAlternate={idx % 2 === 1}>
                  <StyledTd>{`${prependZero(idx * game.fluctuationsInterval, 2)}분`}</StyledTd>
                  {companyList.map((company) => {
                    const diff = idx === 0 ? 0 : companies[company][idx].가격 - companies[company][idx - 1].가격;
                    const 등락 = diff > 0 ? `${Math.abs(diff)}▲` : diff < 0 ? `${Math.abs(diff)}▼` : '-';

                    const 정보 = companies[company][idx].정보
                      .map((userId: string) => {
                        const nickname = users?.find((v) => v.userId === userId)?.userInfo.nickname;
                        return nickname;
                      })
                      .join(' / ');

                    if (elapsedTime.getMinutes() >= idx * game.fluctuationsInterval || pov === 'host') {
                      return (
                        <React.Fragment key={company}>
                          <StyledTd isPositive={diff > 0} isNegative={diff < 0}>
                            {commaizeNumber(등락)}
                          </StyledTd>
                          <StyledTd isBold>{commaizeNumber(companies[company][idx]?.가격)}</StyledTd>
                          <StyledTd>{pov === 'host' ? 정보 : '.'}</StyledTd>
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={company}>
                        <StyledTd isHidden>?</StyledTd>
                        <StyledTd isHidden>?</StyledTd>
                        <StyledTd isHidden>.</StyledTd>
                      </React.Fragment>
                    );
                  })}
                </StyledTr>
              );
            })}
          </tbody>
        </StyledTable>
      )}
    </TableContainer>
  );

  return (
    <StyledWrapper>
      {/* 시세 현황 테이블 - 상위 5개 회사 */}
      {firstHalfCompanies.length > 0 &&
        renderPriceTable(firstHalfCompanies, firstPriceTableCollapsed, setFirstPriceTableCollapsed)}

      {/* 시세 현황 테이블 - 하위 5개 회사 */}
      {secondHalfCompanies.length > 0 &&
        renderPriceTable(secondHalfCompanies, secondPriceTableCollapsed, setSecondPriceTableCollapsed)}

      {/* 잔여 주식 현황 테이블 - 접기/펼치기 기능 */}
      <TableContainer>
        <CollapsibleTableTitle
          onClick={() => setRemainingStocksCollapsed(!remainingStocksCollapsed)}
          isCollapsed={remainingStocksCollapsed}
        >
          잔여 주식 현황
          <CollapseIndicator isCollapsed={remainingStocksCollapsed} />
        </CollapsibleTableTitle>

        {!remainingStocksCollapsed && (
          <StyledTable>
            <thead>
              <tr>
                <StyledTh>잔여주식</StyledTh>
                {companyNames.map((company) => (
                  <StyledTh key={company} isCompany>
                    {company}
                  </StyledTh>
                ))}
              </tr>
            </thead>
            <tbody>
              <StyledTr>
                <StyledTd isBold>시장</StyledTd>
                {companyNames.map((company) => (
                  <StyledTd key={company} isBold>
                    {remainingStocks[company]}
                  </StyledTd>
                ))}
              </StyledTr>
              {users?.map((user, index) => {
                return (
                  <StyledTr key={user.userId} isAlternate={index % 2 === 1}>
                    <StyledTd>{profiles?.data?.find((v) => v.id === user.userId)?.username}</StyledTd>
                    {companyNames.map((company) => {
                      return (
                        <StyledTd key={company}>
                          {user.stockStorages.find(({ companyName }) => companyName === company)?.stockCountCurrent ||
                            ''}
                        </StyledTd>
                      );
                    })}
                  </StyledTr>
                );
              })}
            </tbody>
          </StyledTable>
        )}
      </TableContainer>

      {/* 소지금 현황 테이블 - 접기/펼치기 기능 */}
      <TableContainer>
        <CollapsibleTableTitle
          onClick={() => setMoneyStatusCollapsed(!moneyStatusCollapsed)}
          isCollapsed={moneyStatusCollapsed}
        >
          소지금 현황
          <CollapseIndicator isCollapsed={moneyStatusCollapsed} />
        </CollapsibleTableTitle>

        {!moneyStatusCollapsed && (
          <StyledTable>
            <thead>
              <tr>
                <StyledTh>순위</StyledTh>
                <StyledTh>닉네임</StyledTh>
                <StyledTh>현재 소지금</StyledTh>
                <StyledTh>주식 가치</StyledTh>
                <StyledTh>총 자산</StyledTh>
                <StyledTh>이익/손해</StyledTh>
                <StyledTh>수익률</StyledTh>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, i) => {
                const stockValue = userStockValueMap[user.userId] || 0;
                const totalValue = user.money + stockValue;
                const profit = totalValue - game.initialMoney; // 초기 자금 대비 이익
                const profitPercentage = ((profit / game.initialMoney) * 100).toFixed(1);

                return (
                  <StyledTr key={user.userId} isAlternate={i % 2 === 1}>
                    {/* 순위 */}
                    <StyledTd>
                      <RankBadge>{i + 1}</RankBadge>
                    </StyledTd>

                    {/* 닉네임 */}
                    <StyledTd isBold>{profiles?.data?.find((v) => v.id === user.userId)?.username}</StyledTd>

                    {/* 현재 소지금 */}
                    <StyledTd isBold>{commaizeNumber(user.money)}</StyledTd>

                    {/* 주식 가치 */}
                    <StyledTd>{commaizeNumber(stockValue)}</StyledTd>

                    {/* 총 자산 */}
                    <StyledTd isBold>{commaizeNumber(totalValue)}</StyledTd>

                    {/* 이익/손해 */}
                    <StyledTd isPositive={profit > 0} isNegative={profit < 0}>
                      {profit > 0 ? '+' : ''}
                      {commaizeNumber(profit)}
                    </StyledTd>

                    {/* 수익률 */}
                    <StyledTd isPositive={profit > 0} isNegative={profit < 0}>
                      {profit > 0 ? '+' : ''}
                      {profitPercentage}%
                    </StyledTd>
                  </StyledTr>
                );
              })}
            </tbody>
          </StyledTable>
        )}
      </TableContainer>

      {/* 라운드별 결과 테이블 - 접기/펼치기 기능 */}
      <TableContainer>
        <CollapsibleTableTitle
          onClick={() => setRoundResultsCollapsed(!roundResultsCollapsed)}
          isCollapsed={roundResultsCollapsed}
        >
          라운드별 결과
          <CollapseIndicator isCollapsed={roundResultsCollapsed} />
        </CollapsibleTableTitle>

        {!roundResultsCollapsed && (
          <StyledTable>
            <thead>
              <tr>
                <StyledTh>순위</StyledTh>
                <StyledTh>닉네임</StyledTh>
                <StyledTh>0라운드</StyledTh>
                <StyledTh>1라운드</StyledTh>
                <StyledTh>2라운드</StyledTh>
                <StyledTh isHighlighted>1+2 합계</StyledTh>
                <StyledTh isHighlighted>1+2 평균</StyledTh>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, i) => {
                const round0 = results?.filter((v) => v.userId === user.userId && v.round === 0)[0]?.money ?? 0;
                const round1 = results?.filter((v) => v.userId === user.userId && v.round === 1)[0]?.money ?? 0;
                const round2 = results?.filter((v) => v.userId === user.userId && v.round === 2)[0]?.money ?? 0;
                const roundSum = round1 + round2 || 0;
                const roundAvg = roundSum / (round1 && round2 ? 2 : round1 || round2 ? 1 : 1) || 0;

                return (
                  <StyledTr key={user.userId} isAlternate={i % 2 === 1}>
                    <StyledTd>
                      <RankBadge>{i + 1}</RankBadge>
                    </StyledTd>
                    <StyledTd isBold>{profiles?.data?.find((v) => v.id === user.userId)?.username}</StyledTd>
                    <StyledTd>{commaizeNumber(round0)}</StyledTd>
                    <StyledTd>{commaizeNumber(round1)}</StyledTd>
                    <StyledTd>{commaizeNumber(round2)}</StyledTd>
                    <StyledTd isHighlighted>{commaizeNumber(roundSum)}</StyledTd>
                    <StyledTd isHighlighted>{commaizeNumber(roundAvg)}</StyledTd>
                  </StyledTr>
                );
              })}
            </tbody>
          </StyledTable>
        )}
      </TableContainer>
    </StyledWrapper>
  );
};

export default Table;

// 스타일 컴포넌트
const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  min-width: min-content;
  padding-bottom: 4rem;
  margin-bottom: 1rem;
  min-height: 100%;
`;

const TableContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  min-width: min-content;
`;

const TableTitle = styled.h3`
  margin: 0;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  color: #3f51b5;
`;

const CollapsibleTableTitle = styled(TableTitle)<{ isCollapsed: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #e9ecef;
  }
`;

const CollapseIndicator = styled.div<{ isCollapsed: boolean }>`
  width: 20px;
  height: 20px;
  position: relative;

  &:before,
  &:after {
    content: '';
    position: absolute;
    background-color: #3f51b5;
    transition: transform 0.2s ease;
  }

  &:before {
    top: 9px;
    left: 0;
    width: 100%;
    height: 2px;
  }

  &:after {
    top: 0;
    left: 9px;
    width: 2px;
    height: 100%;
    transform: ${({ isCollapsed }) => (isCollapsed ? 'none' : 'scaleY(0)')};
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  table-layout: auto;
  white-space: nowrap;
`;

const StyledTh = styled.th<{ isCompany?: boolean; isHighlighted?: boolean }>`
  padding: 0.75rem;
  text-align: center;
  border: 1px solid #e9ecef;
  background-color: ${({ isCompany, isHighlighted }) => {
    if (isCompany) return 'rgba(63, 81, 181, 0.08)';
    if (isHighlighted) return 'rgba(63, 81, 181, 0.05)';
    return '#f8f9fa';
  }};
  color: ${({ isCompany, isHighlighted }) => {
    if (isCompany || isHighlighted) return '#3f51b5';
    return '#495057';
  }};
  font-weight: 600;
  white-space: nowrap;
`;

const StyledTr = styled.tr<{ isAlternate?: boolean }>`
  background-color: ${({ isAlternate }) => (isAlternate ? 'rgba(0, 0, 0, 0.02)' : 'white')};
`;

const StyledTd = styled.td<{
  isPositive?: boolean;
  isNegative?: boolean;
  isBold?: boolean;
  isHidden?: boolean;
  isHighlighted?: boolean;
}>`
  padding: 0.75rem;
  text-align: center;
  border: 1px solid #e9ecef;
  color: ${({ isPositive, isNegative, isHidden, isHighlighted }) => {
    if (isPositive) return '#f44336';
    if (isNegative) return '#4caf50';
    if (isHidden) return '#adb5bd';
    if (isHighlighted) return '#3f51b5';
    return '#495057';
  }};
  font-weight: ${({ isBold, isHighlighted }) => (isBold || isHighlighted ? '600' : '400')};
  background-color: ${({ isHighlighted }) => (isHighlighted ? 'rgba(63, 81, 181, 0.05)' : 'inherit')};
  white-space: nowrap;
`;

const RankBadge = styled.span`
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background-color: #3f51b5;
  color: white;
  border-radius: 50%;
  font-size: 0.8rem;
  margin-right: 5px;
`;

const SmallText = styled.span`
  font-size: 0.8rem;
  opacity: 0.8;
`;
