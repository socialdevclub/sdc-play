import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { objectEntries } from '@toss/utils';
import { HintVisibility } from 'shared~type-stock';
import { Query } from '../../../../../hook';
import { UserStore } from '../../../../../store';
import useTimeRaceCheck from '../../../../../hook/useTimeRaceCheck';

/**
 * V2 카드 타입
 * - A형: 종목명 + 변동폭 표시 (라운드, 방향 숨김)
 * - B형: 라운드 + 방향 + 변동폭 표시 (종목명 숨김)
 */
export type V2CardType = 'A' | 'B';

/**
 * V2 카드 정보 인터페이스
 */
export interface V2CardInfo {
  /** 종목명 (A형에서만 표시) */
  company: string;
  /** 라운드 idx (0~9), B형에서만 표시 */
  timeIdx: number;
  /** 변동률 % (양수: 상승, 음수: 하락) */
  fluctuation: number;
  /** 방향 (B형에서만 표시) */
  direction: 'up' | 'down';
  /** 카드 타입 (A형 또는 B형) */
  cardType: V2CardType;
  /** 가시성 정보 */
  isVisible: HintVisibility;
}

interface Props {
  stockId: string;
}

/**
 * V2 게임 모드 전용 카드 정보 훅
 *
 * V2에서는 hints 배열을 사용하여 카드 정보를 추출합니다.
 * - fixedFluctuation: 퍼센티지 값 (-50 ~ +50)
 * - isVisible: A형/B형 구분을 위한 가시성 정보
 *
 * @example
 * const { cards, futureCards, pastCards, isV2Mode } = useV2CardInfo({ stockId });
 *
 * if (!isV2Mode) {
 *   // 기존 로직 사용
 * }
 *
 * futureCards.map(card => {
 *   if (card.cardType === 'A') {
 *     return `${card.company} ${Math.abs(card.fluctuation)}%`;
 *   } else {
 *     return `${card.timeIdx + 1}R ${card.direction === 'up' ? '상승' : '하락'} ${Math.abs(card.fluctuation)}%`;
 *   }
 * });
 */
const useV2CardInfo = ({ stockId }: Props) => {
  const supabaseSession = useAtomValue(UserStore.supabaseSession);
  const userId = supabaseSession?.user.id;

  const { data: stock, refetch, timeIdx: currentTimeIdx } = Query.Stock.useQueryStock(stockId);
  const { gameTime } = useTimeRaceCheck({ refetch, stock });

  const isV2Mode = stock?.gameMode === 'v2';

  // 현재 시간 (초 단위)
  const gameTimeInSeconds = gameTime
    ? parseInt(gameTime.split(':')[0], 10) * 60 + parseInt(gameTime.split(':')[1], 10)
    : 0;

  // V2 카드 정보 추출
  const cards = useMemo(() => {
    if (!stock || !userId || !isV2Mode) {
      return [];
    }

    const result: V2CardInfo[] = [];

    objectEntries(stock.companies).forEach(([company, companyInfos]) => {
      companyInfos.forEach((companyInfo, idx) => {
        companyInfo.hints?.forEach((myHint) => {
          // hints 배열에서 내 카드 찾기
          if (myHint.userId === userId && companyInfo.fixedFluctuation !== undefined) {
            const fluctuation = companyInfo.fixedFluctuation;
            const cardType: V2CardType = myHint.isVisible.companyName ? 'A' : 'B';

            result.push({
              cardType,
              company,
              direction: fluctuation >= 0 ? 'up' : 'down',
              fluctuation,
              isVisible: myHint.isVisible,
              timeIdx: idx,
            });
          }
        });
      });
    });

    // timeIdx 기준 정렬
    return result.sort((a, b) => a.timeIdx - b.timeIdx);
  }, [stock, userId, isV2Mode]);

  // 미래/과거 카드 분리
  const { futureCards, pastCards } = useMemo(() => {
    if (!stock) {
      return { futureCards: [], pastCards: [] };
    }

    const future: V2CardInfo[] = [];
    const past: V2CardInfo[] = [];

    cards.forEach((card) => {
      const cardTimeInSeconds = card.timeIdx * 60 * stock.fluctuationsInterval;

      if (cardTimeInSeconds >= gameTimeInSeconds) {
        future.push(card);
      } else {
        past.push(card);
      }
    });

    // 미래: 시간순 정렬 (가까운 것 먼저)
    // 과거: 역순 정렬 (최근 것 먼저)
    return {
      futureCards: future.sort((a, b) => a.timeIdx - b.timeIdx),
      pastCards: past.sort((a, b) => b.timeIdx - a.timeIdx),
    };
  }, [cards, gameTimeInSeconds, stock]);

  return {
    /** 전체 카드 목록 */
    cards,
    /** 현재 시간 기준 timeIdx */
    currentTimeIdx,
    /** 변동 주기 (분) */
    fluctuationsInterval: stock?.fluctuationsInterval ?? 5,
    /** 미래 카드 (아직 적용되지 않은 이벤트) */
    futureCards,
    /** 현재 게임 시간 (분 단위) */
    gameTimeInMinutes: Math.ceil(parseInt(gameTime?.split(':')[0] ?? '0', 10)),
    /** V2 모드 여부 */
    isV2Mode,
    /** 과거 카드 (이미 적용된 이벤트) */
    pastCards,
    /** 주식 데이터 */
    stock,
    /** 사용자 ID */
    userId,
  };
};

export default useV2CardInfo;
