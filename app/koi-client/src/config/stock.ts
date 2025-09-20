export const DEFAULT_FLUCTUATION_INTERVAL = 5;

export const STOCK_PER_USER = 3;

export const TOTAL_ROUND_COUNT = 10;

export const REMAINING_STOCK_THRESHOLD = 0.9;

export const TRADE = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export type Trade = (typeof TRADE)[keyof typeof TRADE];

export const STOCK_TRADE_STATUS = {
  CANCEL: 'CANCEL',
  FAILED: 'FAILED',
  QUEUING: 'QUEUING',
  SUCCESS: 'SUCCESS',
} as const;

export type StockTradeStatus = (typeof STOCK_TRADE_STATUS)[keyof typeof STOCK_TRADE_STATUS];

export const ANIMAL_NAME: Record<string, string> = {
  QQQ: 'qqq',
  'S&P500': 'snp500',
  TDF2060: 'tdf',
  고양기획: 'cat',
  금: 'gold',
  꿀벌생명: 'honeyBee',
  늑대통신: 'wolf',
  멍멍제과: 'dog',
  미국달러SOFR: 'sofr',
  비트코인: 'bitcoin',
  수달물산: 'otter',
  여우은행: 'fox',
  용용카드: 'dragon',
  '원화 CMA': 'cma',
  채권: 'bonds',
  코스피: 'kospi',
  토끼건설: 'rabbit',
  해삐코인: 'happycoin',
  햄찌금융: 'hamster',
  호랑전자: 'tiger',
};
