import { useRef, useState, useEffect } from 'react';
import { Response } from 'shared~type-stock';
import useUserList from './query/Stock/useUserList';

export interface Trade {
  type: 'BUY' | 'SELL';
  company: string;
  amount: number;
  timestamp: number;
  userId: string;
}

interface UseTradeDetectionOptions {
  maxTrades?: number;
  tradeTimeout?: number;
  refetchInterval?: number;
}

export const useTradeDetection = (
  stockId: string,
  options: UseTradeDetectionOptions = {},
): {
  getRecentTradeByCompany: (company: string) => Trade | undefined;
  getTradeStats: () => { buyCount: number; sellCount: number; totalVolume: number };
  getTradingActivity: (company: string, timeWindow?: number) => string;
  trades: Trade[];
} => {
  const { maxTrades = 50, tradeTimeout = 10000 } = options;

  const { data: users } = useUserList(stockId, {
    enabled: !!stockId,
  });

  const prevUsersRef = useRef<Response.GetStockUser[]>();
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (prevUsersRef.current && users) {
      const trades: Trade[] = [];

      users.forEach((user) => {
        const prevUser = prevUsersRef.current?.find((u) => u.userId === user.userId);
        if (!prevUser) return;

        user.stockStorages.forEach((storage) => {
          const prevStorage = prevUser.stockStorages.find((s) => s.companyName === storage.companyName);

          if (!prevStorage) return;

          const prevCount = prevStorage.stockCountCurrent;
          const currCount = storage.stockCountCurrent;

          if (currCount !== prevCount) {
            trades.push({
              amount: Math.abs(currCount - prevCount),
              company: storage.companyName,
              timestamp: Date.now(),
              type: currCount > prevCount ? 'BUY' : 'SELL',
              userId: user.userId,
            });
          }
        });
      });

      if (trades.length > 0) {
        setRecentTrades((prev) => {
          const now = Date.now();
          return [...prev, ...trades].filter((t) => now - t.timestamp < tradeTimeout).slice(-maxTrades);
        });
      }
    }

    prevUsersRef.current = users ? [...users] : undefined;
  }, [users, maxTrades, tradeTimeout]);

  // 주기적으로 오래된 거래 제거
  useEffect(() => {
    const interval = setInterval((): void => {
      setRecentTrades((prev) => {
        const now = Date.now();
        return prev.filter((t) => now - t.timestamp < tradeTimeout);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tradeTimeout]);

  // 종목별 최근 거래 찾기
  const getRecentTradeByCompany = (company: string): Trade | undefined => {
    return recentTrades.filter((t) => t.company === company).sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  // 거래 활성도 계산
  const getTradingActivity = (company: string, timeWindow = 5000): string => {
    const now = Date.now();
    const recentCompanyTrades = recentTrades.filter((t) => t.company === company && now - t.timestamp < timeWindow);

    if (recentCompanyTrades.length >= 5) return 'hot';
    if (recentCompanyTrades.length >= 3) return 'warm';
    if (recentCompanyTrades.length >= 1) return 'active';
    return 'idle';
  };

  // 전체 거래량 통계
  const getTradeStats = (): { buyCount: number; sellCount: number; totalVolume: number } => {
    const buyCount = recentTrades.filter((t) => t.type === 'BUY').length;
    const sellCount = recentTrades.filter((t) => t.type === 'SELL').length;
    const totalVolume = recentTrades.reduce((sum, t) => sum + t.amount, 0);

    return { buyCount, sellCount, totalVolume };
  };

  return {
    getRecentTradeByCompany,
    getTradeStats,
    getTradingActivity,
    trades: recentTrades,
  };
};
