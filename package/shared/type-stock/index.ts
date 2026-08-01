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
  resultByRound: (number | null)[];
  /**
   * V2 전용: 플레이어 등급 (라운드 시작 시 계산됨)
   */
  grade?: PlayerGrade;
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

// V2 카드 가시성 타입
export type HintVisibility = {
  companyName: boolean; // A형: true, B형: false
  round: boolean; // A형: false, B형: true
  direction: boolean; // A형: false, B형: true
  fluctuation: boolean; // 항상 true
};

// V2 카드 상세 정보
export type HintDetail = {
  userId: string;
  isVisible: HintVisibility;
};

export type CompanyInfo = {
  가격: number;
  정보: string[]; // userId 목록 (기존 호환)
  // V2 전용 (optional)
  hints?: HintDetail[]; // 카드 상세 정보 (가시성 포함)
  fixedFluctuation?: number; // 고정 가격 이벤트 변동률
};

const StockGameMode = {
  DALTO: 'dalto',
  REALISM: 'realism',
  STOCK: 'stock',
  V2: 'v2',
} as const;
export type StockGameMode = (typeof StockGameMode)[keyof typeof StockGameMode];

// V2 등급 시스템
export type PlayerGrade = 'whale' | 'shrimp' | 'ant';

// V2 등급 설정 (initStockV2에서 정의)
export type GradeConfig = {
  thresholds: {
    whale: number; // 상위 N% (예: 0.3 = 상위 30%)
    shrimp: number; // 중간까지 N% (예: 0.7 = 상위 30~70%)
    // ant는 나머지
  };
  multipliers: {
    whale: number; // 영향력 배수 (예: 0.5)
    shrimp: number; // 영향력 배수 (예: 1.0)
    ant: number; // 영향력 배수 (예: 2.0)
  };
};

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
  maxStockHintCount: number | null;
  /**
   * 최대 개인 보유 주식 개수
   *
   * 백엔드에서는 무한개를 `null`로 관리합니다.
   */
  maxPersonalStockCount: number | null;
  /**
   * 게임 모드
   *
   * 게임 모드는 백엔드에서 정의한 문자열로 관리합니다.
   * 예시: 'realism', 'stock', 'custom', 'v2'
   */
  gameMode: StockGameMode;
  /**
   * V2 전용: 초기 지급 주식 수
   */
  initialStockCount?: number;
  /**
   * V2 전용: 등급 설정 (thresholds, multipliers)
   */
  gradeConfig?: GradeConfig;
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
