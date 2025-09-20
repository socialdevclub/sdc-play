import { PROFIT_BADGE_COLOR } from '../color';

export const renderProfitBadge = (
  stockProfitRate: number | null,
): { backgroundColor: string; color: string; text: string } => {
  if (stockProfitRate === null) {
    return {
      backgroundColor: PROFIT_BADGE_COLOR.NEUTRAL,
      color: '#94A3B8',
      text: '해당 주식이 없어요',
    };
  }
  if (stockProfitRate > 0) {
    return {
      backgroundColor: PROFIT_BADGE_COLOR.PROFIT,
      color: '#a3e635',
      text: `+${stockProfitRate}% 수익 중`,
    };
  }
  if (stockProfitRate < 0) {
    return {
      backgroundColor: PROFIT_BADGE_COLOR.LOSS,
      color: '#DC2626',
      text: `${stockProfitRate}% 손실 중`,
    };
  }
  return {
    backgroundColor: PROFIT_BADGE_COLOR.NEUTRAL,
    color: '#94A3B8',
    text: '0% 변동 없음',
  };
};
