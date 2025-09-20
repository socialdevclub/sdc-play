import dayjs from 'dayjs';
import { StockConfig } from 'shared~config';
import {
  StockStorageSchema,
  StockUserForm,
  StockUserInfoSchema,
  StockUserRequired,
  StockUserSchema,
} from 'shared~type-stock';

const INIT_USER_MONEY = 1_000_000;

export class StockUserStorage implements StockStorageSchema {
  companyName: string;

  stockAveragePrice: number;

  stockAveragePriceHistory: number[];

  stockCountCurrent: number;

  stockCountHistory: number[];
}

export class StockUserInfo implements StockUserInfoSchema {
  gender: string;

  nickname: string;

  introduction?: string;
}

export class StockUser implements StockUserSchema {
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

  constructor(required: Pick<StockUserSchema, StockUserRequired>, partial: StockUserForm, companyNames: string[]) {
    this.userId = required.userId;
    this.stockId = required.stockId;
    this.userInfo = required.userInfo;

    this.index = partial.index ?? 0;
    this.money = partial.money ?? INIT_USER_MONEY;
    this.moneyHistory = new Array(StockConfig.MAX_STOCK_IDX + 1).fill(INIT_USER_MONEY);
    this.lastActivityTime = dayjs().toISOString();
    this.loanCount = partial.loanCount ?? 0;

    const stockStorages = companyNames.map((company) => {
      return {
        companyName: company,
        stockAveragePrice: 0,
        stockAveragePriceHistory: new Array(StockConfig.MAX_STOCK_IDX + 1).fill(0),
        stockCountCurrent: 0,
        stockCountHistory: new Array(StockConfig.MAX_STOCK_IDX + 1).fill(0),
      } as StockStorageSchema;
    });

    this.stockStorages = partial.stockStorages ?? stockStorages;
    this.resultByRound = [];
  }
}
