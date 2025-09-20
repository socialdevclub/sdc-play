import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { CompanyInfo, StockGameMode, StockPhase, StockSchema } from 'shared~type-stock';

export class Stock implements StockSchema {
  _id: string;

  stockPhase: StockPhase;

  startedTime: string;

  companies: Record<string, CompanyInfo[]>;

  remainingStocks: Record<string, number>;

  isVisibleRank: boolean;

  isTransaction: boolean;

  transactionInterval: number;

  fluctuationsInterval: number;

  round: number;

  initialMoney: number;

  hasLoan: boolean;

  maxStockHintCount: number;

  maxMarketStockCount: number;

  maxPersonalStockCount: number;

  gameMode: StockGameMode;

  constructor() {
    this._id = randomUUID();
    this.stockPhase = 'CROWDING';
    this.startedTime = dayjs().toISOString();
    this.remainingStocks = {};
    this.companies = {};
    this.isVisibleRank = false;
    this.isTransaction = false;
    this.transactionInterval = 0;
    this.fluctuationsInterval = 5;
    this.round = 0;
    this.initialMoney = 1000000;
    this.hasLoan = true;
    this.maxMarketStockCount = null;
    this.maxPersonalStockCount = null;
    this.maxStockHintCount = null;
    this.gameMode = 'stock';
  }
}
