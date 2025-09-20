export type * as Request from './Request';
export type * as Response from './Response';

export type StockUserRequired = 'stockId' | 'userId' | 'userInfo';
export type StockUserOmitted = 'lastActivityTime';
export type StockUserForm = Pick<StockUserSchema, StockUserRequired> &
  Partial<Omit<StockUserSchema, StockUserRequired | StockUserOmitted>>;

export type StockUserInfoSchema = {
  gender: string;
  nickname: string;
  introduction?: string;
};

export type StockStorageSchema = {
  companyName: string;
  stockCountCurrent: number;
  stockAveragePrice: number;
  /**
   * idx별로 가장 마지막에 거래한 것을 기준으로 평균 주가를 저장합니다.
   */
  stockAveragePriceHistory: number[];
  stockCountHistory: number[];
};

export type StockUserSchema = {
  stockId: string;
  userId: string;
  userInfo: StockUserInfoSchema;
  index: number;
  money: number;
  moneyHistory: number[];
  lastActivityTime: string;
  loanCount: number;
  stockStorages: StockStorageSchema[];
  resultByRound: number[];
};

const StockPhase = {
  CROWDING: 'CROWDING',
  INTRO_INPUT: 'INTRO_INPUT',
  INTRO_RESULT: 'INTRO_RESULT',
  PLAYING: 'PLAYING',
  RESULT: 'RESULT',
  WAITING: 'WAITING',
} as const;
export type StockPhase = (typeof StockPhase)[keyof typeof StockPhase];

export type CompanyInfo = {
  가격: number;
  정보: string[];
};

const StockGameMode = {
  REALISM: 'realism',
  STOCK: 'stock',
} as const;
export type StockGameMode = (typeof StockGameMode)[keyof typeof StockGameMode];

export type StockSchema = {
  _id: string;
  stockPhase: StockPhase;
  startedTime: string;
  companies: Record<string, CompanyInfo[]>;
  remainingStocks: Record<string, number>;
  isVisibleRank: boolean;
  isTransaction: boolean;
  /**
   * 빠른거래제한, 초 단위
   */
  transactionInterval: number;
  /**
   * 주식 시세 변동, 분 단위
   */
  fluctuationsInterval: number;
  /**
   * 0라운드 - 연습게임
   * 1라운드 - 본선게임
   * 2라운드 - 본선게임
   */
  round: number;
  initialMoney: number;
  hasLoan: boolean;
  /**
   * 최대 주식 힌트 개수
   *
   * 백엔드에서는 무한개를 `null`로 관리합니다.
   */
  maxStockHintCount: number;
  /**
   * 최대 개인 보유 주식 개수
   *
   * 백엔드에서는 무한개를 `null`로 관리합니다.
   */
  maxPersonalStockCount: number;
  /**
   * 최대 시장 주식 개수
   *
   * 백엔드에서는 무한개를 `null`로 관리합니다.
   */
  maxMarketStockCount: number;

  /**
   * 게임 모드
   *
   * 게임 모드는 백엔드에서 정의한 문자열로 관리합니다.
   * 예시: 'realism', 'stock', 'custom'
   */
  gameMode: StockGameMode;
};
export type StockSchemaWithId = StockSchema;

export type StockLogAction = 'BUY' | 'SELL';
export type StockLogSchema = {
  stockId: string;
  userId: string;
  date: Date;
  round: number;
  action: StockLogAction;
  company: string;
  price: number;
  quantity: number;
  status: 'QUEUING' | 'SUCCESS' | 'FAILED' | 'CANCEL';
  failedReason?: string;
};
