import { HttpException, HttpStatus, Injectable, Inject, forwardRef } from '@nestjs/common';
import type { Request, StockPhase, StockSchema, StockSchemaWithId } from 'shared~type-stock';
import { getDateDistance } from '@toss/date';
import { ceilToUnit } from '@toss/utils';
import dayjs from 'dayjs';
import { StockConfig } from 'shared~config';
import { UserService } from './user/user.service';
import { StockRepository } from './stock.repository';
import { UserRepository } from './user/user.repository';

@Injectable()
export class StockService {
  constructor(
    private readonly stockRepository: StockRepository,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async find(): Promise<StockSchemaWithId[]> {
    return this.stockRepository.find();
  }

  async findOneById(stockId: string): Promise<StockSchemaWithId | null> {
    return this.stockRepository.findOneById(stockId);
  }

  async findOneByIdAndUpdate(stock: Request.PatchUpdateStock): Promise<StockSchemaWithId | null> {
    return this.stockRepository.findOneAndUpdate(stock._id, stock);
  }

  async createStock(): Promise<StockSchemaWithId> {
    return this.stockRepository.create();
  }

  async resetStock(stockId: string): Promise<StockSchemaWithId | null> {
    try {
      // 스톡 업데이트
      const stock = await this.stockRepository.findOneAndUpdate(stockId, {
        companies: {},
        fluctuationsInterval: 5,
        isTransaction: false,
        isVisibleRank: false,
        remainingStocks: {},
        round: 0,
        startedTime: dayjs().toISOString(),
        stockPhase: 'CROWDING',
        transactionInterval: 0,
      });

      return stock;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async initStock(stockId: string, body: Request.PostStockInit): Promise<StockSchemaWithId | null> {
    const { isCustomCompanies, companies, maxStockHintCount, maxMarketStockCount } = body;

    const stockNames = isCustomCompanies ? Object.keys(companies) : body.stockNames;
    const newCompanies: StockSchema['companies'] = {};
    const flatCompanies: { companyName: string; round: number; price: number; fluctuation: number }[] = [];

    // 주식표 정의
    if (isCustomCompanies) {
      Object.entries(companies).forEach(([company, value]) => {
        newCompanies[company] = value.map((v) => ({
          ...v,
          정보: [],
        }));
      });
    } else {
      const defineCompany = ({
        companyName,
        round,
        price,
        fluctuation,
      }: {
        companyName: string;
        round: number;
        price: number;
        fluctuation: number;
      }): void => {
        if (!newCompanies[companyName]) {
          newCompanies[companyName] = [];
        }
        newCompanies[companyName][round] = {
          가격: price,
          정보: [],
        };
        flatCompanies.push({ companyName, fluctuation, price, round });
      };

      stockNames.forEach((company) => {
        for (let round = 0; round <= StockConfig.MAX_STOCK_IDX; round++) {
          if (round === 0) {
            defineCompany({
              companyName: company,
              fluctuation: 0,
              price: StockConfig.INIT_STOCK_PRICE,
              round,
            });
            continue;
          }

          const prevPrice = newCompanies[company][round - 1].가격;

          const calc1 = Math.floor(Math.random() * prevPrice - prevPrice / 2);
          const calc2 = Math.floor(Math.random() * StockConfig.INIT_STOCK_PRICE - StockConfig.INIT_STOCK_PRICE / 2);

          const frunc = Math.abs(calc1) >= Math.abs(calc2) ? calc1 : prevPrice + calc2 <= 0 ? calc1 : calc2;
          const price = ceilToUnit(prevPrice + frunc, StockConfig.INIT_STOCK_PRICE / 1000);

          defineCompany({
            companyName: company,
            fluctuation: frunc,
            price,
            round,
          });
        }
      });
    }

    // 상승한 주식들을 변동폭이 작은 순서대로 정렬합니다.
    const _upwardCompanies = flatCompanies
      .filter((v) => v.fluctuation > 0)
      .sort((a, b) => a.fluctuation - b.fluctuation);

    // 하락한 주식들을 변동폭이 작은 순서대로 정렬합니다.
    const _downwardCompanies = flatCompanies
      .filter((v) => v.fluctuation < 0)
      .sort((a, b) => b.fluctuation - a.fluctuation);

    let upwardCompanies = [..._upwardCompanies];
    let downwardCompanies = [..._downwardCompanies];

    const players = await this.userService.getUserList(stockId);
    const playerIds = players.map((v) => v.userId);

    // 플레이어 목록을 먼저 랜덤으로 돌린다
    // 플레이어 순서대로 +, -, +, -, ... 정보를 뽑는다
    // 남은 힌트 없으면 반대 부호를 뽑는다. 다만, 반대 부호도 없으면 +, - 리스트를 새로 가져온다
    // 힌트 개수는 1~30명은 6개, 31~45명은 4개, 46명 이상은 2개
    const hintCount = Math.min(
      Math.min(Math.max(Math.floor(90 / players.length), 1), 3) * 2,
      maxStockHintCount ?? Infinity,
    );

    const randomPlayers = [...playerIds].sort(() => Math.random() - 0.5);
    const hintPlayers: {
      userId: string;
      companyName: string;
      round: number;
      fluctuation: number;
    }[] = [];

    const pushUpward = (userId: string): void => {
      const upwardCompany = upwardCompanies.shift();
      hintPlayers.push({
        companyName: upwardCompany.companyName,
        fluctuation: upwardCompany.fluctuation,
        round: upwardCompany.round,
        userId,
      });
    };

    const pushDownward = (userId: string): void => {
      const downwardCompany = downwardCompanies.shift();
      hintPlayers.push({
        companyName: downwardCompany.companyName,
        fluctuation: downwardCompany.fluctuation,
        round: downwardCompany.round,
        userId,
      });
    };

    for (let _ = 0; _ < hintCount; _++) {
      for (const userId of randomPlayers) {
        const hintPlayer = hintPlayers.filter((v) => v.userId === userId);
        const upwardCount = hintPlayer.filter((v) => v.fluctuation > 0).length;
        const downwardCount = hintPlayer.filter((v) => v.fluctuation < 0).length;

        if (upwardCompanies.length === 0 && downwardCompanies.length === 0) {
          upwardCompanies = [..._upwardCompanies];
          downwardCompanies = [..._downwardCompanies];
        }

        if (upwardCount <= downwardCount) {
          if (upwardCompanies.length > 0) {
            pushUpward(userId);
          } else if (downwardCompanies.length > 0) {
            pushDownward(userId);
          }
        } else if (downwardCompanies.length > 0) {
          pushDownward(userId);
        } else if (upwardCompanies.length > 0) {
          pushUpward(userId);
        }
      }
    }

    // 힌트 주입하기
    console.log('🚀 ~ StockService ~ initStock ~ hintPlayers:', hintPlayers);
    for (const hint of hintPlayers) {
      const { userId, companyName, round } = hint;

      const { 정보 } = newCompanies[companyName][round];
      if (!정보.some((v) => v === userId)) {
        정보.push(userId);
      }
    }

    // 주식 재고 주입하기
    const remainingStocks = {};
    Object.keys(newCompanies).forEach((company) => {
      remainingStocks[company] = maxMarketStockCount;
    });

    return this.stockRepository.findOneAndUpdate(stockId, {
      companies: newCompanies,
      isTransaction: false,
      isVisibleRank: false,
      maxStockHintCount,
      remainingStocks,
      startedTime: dayjs().toISOString(),
      stockPhase: 'PLAYING',
    });
  }

  async initStockDalto(stockId: string, body: Request.PostStockInit): Promise<StockSchemaWithId | null> {
    const { stockNames, maxMarketStockCount, maxStockHintCount } = body;

    const newCompanies: StockSchema['companies'] = {};
    const hintCompanies: { companyName: string; round: number; price: number; infos: string[] }[] = [];

    // 주식표 정의
    const defineCompany = ({
      companyName,
      round,
      price,
    }: {
      companyName: string;
      round: number;
      price: number;
    }): void => {
      if (!newCompanies[companyName]) {
        newCompanies[companyName] = [];
      }
      newCompanies[companyName][round] = {
        가격: price,
        정보: [],
      };

      if (!companyName.includes('종합지수') && !companyName.includes('2배')) {
        hintCompanies.push({ companyName, infos: [], price, round });
      }
    };

    // 일반주식
    stockNames.forEach((company) => {
      for (let round = 0; round <= StockConfig.MAX_STOCK_IDX; round++) {
        if (round !== 3 && round !== 6 && round !== 9) {
          if (Math.floor(round / 3) > 0) {
            defineCompany({
              companyName: company,
              price: newCompanies[company][Math.floor(round / 3) * 3].가격,
              round,
            });
            continue;
          }
          defineCompany({
            companyName: company,
            price: StockConfig.INIT_STOCK_PRICE,
            round,
          });
          continue;
        }

        const prevPrice = newCompanies[company][round - 1].가격;

        const calc1 = Math.floor(Math.random() * prevPrice - prevPrice / 2);
        const calc2 = Math.floor(Math.random() * StockConfig.INIT_STOCK_PRICE - StockConfig.INIT_STOCK_PRICE / 2);

        const frunc = Math.abs(calc1) >= Math.abs(calc2) ? calc1 : prevPrice + calc2 <= 0 ? calc1 : calc2;
        const price = ceilToUnit(prevPrice + frunc, StockConfig.INIT_STOCK_PRICE / 1000);

        defineCompany({
          companyName: company,
          price,
          round,
        });
      }
    });

    function pushHint(userId: string, companyName: string, idx: number): void {
      hintCompanies.find((v) => v.companyName === companyName && v.round === idx)?.infos.push(userId);
      newCompanies[companyName][idx].정보.push(userId);
    }

    function getCompanies(idx: number, userId: string): { companyName: string; price: number; round: number }[] {
      return hintCompanies
        .filter((v) => v.round === idx && !v.infos.some((v) => v === userId))
        .sort(() => Math.random() - 0.5)
        .sort((a, b) => a.infos.length - b.infos.length);
    }

    const players = await this.userService.getUserList(stockId);
    const getPlayerIds = (): string[] => players.map((v) => v.userId).sort(() => Math.random() - 0.5);

    for (const idx of [3, 3, 6, 6, 9, 9]) {
      for (const userId of getPlayerIds()) {
        const company = getCompanies(idx, userId)[0];
        if (company === undefined) {
          continue;
        }
        pushHint(userId, company.companyName, idx);
      }
    }

    // 주식 재고 주입하기
    const remainingStocks = {};
    Object.keys(newCompanies).forEach((company) => {
      remainingStocks[company] = maxMarketStockCount;
    });

    return this.stockRepository.findOneAndUpdate(stockId, {
      companies: newCompanies,
      isTransaction: false,
      isVisibleRank: false,
      maxStockHintCount,
      remainingStocks,
      startedTime: dayjs().toISOString(),
      stockPhase: 'PLAYING',
    });
  }

  async drawStockInfo(stockId: string, body: Request.PostDrawStockInfo): Promise<StockSchemaWithId | null> {
    try {
      const { userId } = body;

      const stock = await this.stockRepository.findOneById(stockId);
      const user = await this.userRepository.findOne({ stockId, userId });

      if (!stock) {
        throw new HttpException('스톡을 찾을 수 없습니다', HttpStatus.NOT_FOUND);
      }

      if (!stock.isTransaction) {
        throw new HttpException('지금은 거래할 수 없습니다', HttpStatus.CONFLICT);
      }

      if (!user) {
        throw new HttpException('유저 정보를 불러올 수 없습니다', HttpStatus.CONFLICT);
      }

      // 현재 라운드에 해당하는 시점의 idx
      const timeIdx = Math.min(
        Math.floor(getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).minutes / stock.fluctuationsInterval),
        9,
      );

      const nextTimeIdx = timeIdx + StockConfig.ROUND_SKIP_STEP;

      if (user.money < StockConfig.DEFAULT_DRAW_COST) {
        throw new HttpException('잔액이 부족합니다', HttpStatus.CONFLICT);
      }

      const { companies } = stock;

      // 이미 정보를 가지고 있지 않은 회사들 중에서만 선택
      const availableCompanies = Object.entries(companies)
        .filter(([_, companyInfos]) => {
          // nextTimeIdx 이후의 모든 시점에서 정보를 가지고 있지 않은 회사만 선택
          return companyInfos.slice(nextTimeIdx).some((info) => !info.정보.includes(userId));
        })
        .map(([company]) => company);

      if (availableCompanies.length === 0) {
        throw new HttpException('더 이상 뽑을 수 있는 정보가 없습니다', HttpStatus.CONFLICT);
      }

      // 랜덤으로 회사 선택
      const randomIndex = Math.floor(Math.random() * availableCompanies.length);
      const selectedCompany = availableCompanies[randomIndex];

      // 랜덤으로 시점 선택 (정보를 가지고 있는 시점만 선택)
      let randomTimeIndex = Math.floor(Math.random() * (companies[selectedCompany].length - nextTimeIdx)) + nextTimeIdx;

      // 선택된 회사의 정보 업데이트
      const companyInfos = [...companies[selectedCompany]]; // 배열 복사

      // 해당 배열안에 이미 user Id가 있는지 확인
      let isExistUser = companyInfos[randomTimeIndex].정보.find((v) => v === userId);
      // user Id가 있는 때는 randomTimeIndex를 다시 생성
      while (isExistUser) {
        randomTimeIndex = Math.floor(Math.random() * (companies[selectedCompany].length - nextTimeIdx)) + nextTimeIdx;
        isExistUser = companyInfos[randomTimeIndex].정보.find((v) => v === userId);
      }

      companyInfos[randomTimeIndex] = {
        ...companyInfos[randomTimeIndex],
        정보: [...companyInfos[randomTimeIndex].정보, userId],
      };

      // 업데이트된 회사 정보로 객체 생성
      const updatedCompanies = { ...companies };
      updatedCompanies[selectedCompany] = companyInfos;

      // 스톡 정보 업데이트
      await this.stockRepository.findOneAndUpdate(stockId, {
        companies: updatedCompanies,
      });

      // 사용자 정보 업데이트
      await this.userRepository.findOneAndUpdate(
        { stockId, userId },
        {
          lastActivityTime: dayjs().toISOString(),
          money: user.money - StockConfig.DEFAULT_DRAW_COST,
        },
      );

      // 최종 정보 반환
      return this.stockRepository.findOneById(stockId);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async allUserSellStock(stockId: string): Promise<StockSchemaWithId | null> {
    try {
      const stock = await this.stockRepository.findOneById(stockId);
      const users = await this.userRepository.find({ stockId });

      if (!stock) {
        throw new Error('stock not found');
      }

      if (!users || users.length === 0) {
        throw new Error('users not found');
      }

      const { companies, remainingStocks } = stock;

      const idx = Math.min(
        Math.floor(getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).minutes / stock.fluctuationsInterval),
        StockConfig.MAX_STOCK_IDX,
      );

      // 각 사용자의 주식 판매 처리
      for (const user of users) {
        let updatedMoney = user.money;
        let updatedStockStorages = [...user.stockStorages];

        // 사용자의 모든 주식 판매 처리
        updatedStockStorages = updatedStockStorages.map((stockStorage) => {
          const companyPrice = companies[stockStorage.companyName][idx]?.가격;
          const totalPrice = companyPrice * stockStorage.stockCountCurrent;

          // 사용자 잔액 증가
          updatedMoney += totalPrice;

          // 재고 업데이트
          const companyRemainingStock = remainingStocks[stockStorage.companyName] || 0;
          remainingStocks[stockStorage.companyName] = companyRemainingStock + stockStorage.stockCountCurrent;

          // 주식 보유량 이력 업데이트
          const updatedStockCountHistory = [...stockStorage.stockCountHistory];
          updatedStockCountHistory[idx] -= stockStorage.stockCountCurrent;

          return {
            ...stockStorage,
            stockCountCurrent: 0,
            stockCountHistory: updatedStockCountHistory,
          };
        });

        // 대출금 상환
        const loanMoney = user.loanCount * StockConfig.SETTLE_LOAN_PRICE;
        updatedMoney -= loanMoney;

        user.resultByRound = user.resultByRound ?? [];
        for (let i = 0; i < stock.round; i++) {
          if (typeof user.resultByRound[i] !== 'number') {
            user.resultByRound[i] = null;
          }
        }
        user.resultByRound[stock.round] = updatedMoney;

        // 사용자 정보 업데이트
        await this.userRepository.findOneAndUpdate(
          { stockId, userId: user.userId },
          {
            loanCount: 0,
            money: updatedMoney,
            resultByRound: user.resultByRound,
            stockStorages: updatedStockStorages,
          },
        );
      }

      // 재고 정보 업데이트
      return this.stockRepository.findOneAndUpdate(stockId, {
        remainingStocks,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deleteStock(stockId: string): Promise<boolean> {
    try {
      // 관련된 데이터 모두 삭제
      await this.userService.removeAllUser(stockId);
      await this.stockRepository.deleteMany({ _id: stockId });

      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async setStockPhase(stockId: string, phase: StockPhase): Promise<StockSchemaWithId | null> {
    if (phase === 'INTRO_RESULT') {
      await this.userService.alignIndexByOpenAI(stockId);
    }
    return this.stockRepository.findOneAndUpdate(stockId, { stockPhase: phase });
  }
}
