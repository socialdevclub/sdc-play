import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import type { Request, Response, PlayerGrade, GradeConfig, StockSchema, StockUserSchema } from 'shared~type-stock';
import { getDateDistance } from '@toss/date';
import dayjs from 'dayjs';
import { UserRepository } from './user/user.repository';
import { StockRepository } from './stock.repository';
import { Stock } from './stock.schema';

@Injectable()
export class StockProcessor {
  constructor(
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    private readonly stockRepository: StockRepository,
  ) {}

  /**
   * 시장 영향 시스템 - 거래량에 따른 가격 변동 적용
   * @param currentPrice 현재 가격
   * @param action 매수/매도 액션
   * @param amount 거래량
   * @returns 시장 영향이 적용된 새로운 가격
   */
  private applyMarketImpact(currentPrice: number, action: 'BUY' | 'SELL', amount: number): number {
    // 1. 영향도 계산 (주당 0.2%, 최대 30% 제한)
    const rawImpact = amount * 0.002;
    const cappedImpact = Math.min(rawImpact, 0.3);
    const finalImpact = action === 'BUY' ? cappedImpact : -cappedImpact;

    // 2. 새 가격 계산
    const newPrice = currentPrice * (1 + finalImpact);

    // 3. 절대 하한선 적용 (100원)
    const boundedPrice = Math.max(100, newPrice);

    // 4. 100원 단위 즉시 반올림
    return Math.round(boundedPrice / 100) * 100;
  }

  /**
   * V2 등급 계산 - 가난할수록 whale, 부유할수록 ant
   * 모든 자산이 동일하면 shrimp 반환
   * 동점자는 Percentile Rank 방식으로 평균 순위 적용
   *
   * @example [100, 200×8, 300]원:
   * - 100원 → whale (percentile 0.1)
   * - 200원 → shrimp (percentile 0.55)
   * - 300원 → ant (percentile 1.0)
   *
   * @example [200×10]원: 모두 → shrimp (동일 자산)
   */
  private calculateGrade(userAsset: number, allUserAssets: number[], gradeConfig?: GradeConfig): PlayerGrade {
    if (!gradeConfig) return 'shrimp';

    const n = allUserAssets.length;
    if (n <= 1) return 'shrimp';

    // 모든 자산이 동일하면 shrimp
    const minAsset = Math.min(...allUserAssets);
    const maxAsset = Math.max(...allUserAssets);
    if (minAsset === maxAsset) return 'shrimp';

    // Percentile Rank 계산 (동점 처리 포함)
    // 부유한 순으로 등급 부여: 부유할수록 whale(고래), 가난할수록 ant(개미)
    const belowCount = allUserAssets.filter((a) => a < userAsset).length;
    const sameCount = allUserAssets.filter((a) => a === userAsset).length;
    // 평균 순위 = belowCount + (sameCount + 1) / 2
    const avgRank = belowCount + (sameCount + 1) / 2;
    // percentile이 높을수록 부유함 (나보다 가난한 사람이 많음)
    const percentile = avgRank / n;

    const { thresholds } = gradeConfig;
    // 상위 30% (부유) → whale, 하위 30% (가난) → ant
    if (percentile >= 1 - thresholds.whale) return 'whale';
    if (percentile >= 1 - thresholds.shrimp) return 'shrimp';
    return 'ant';
  }

  /**
   * V2 유저 총 자산 계산 (현금 + 보유주식 평가액)
   */
  private calculateUserTotalAsset(user: StockUserSchema, stock: StockSchema, idx: number): number {
    const stockValue = user.stockStorages.reduce((acc, storage) => {
      const companyInfo = stock.companies[storage.companyName];
      if (!companyInfo) return acc;
      const currentPrice = companyInfo[idx]?.가격 ?? 0;
      return acc + storage.stockCountCurrent * currentPrice;
    }, 0);
    return user.money + stockValue;
  }

  /**
   * V2 가격 업데이트 - 매 거래 후 다음 라운드 가격 재계산
   * 모든 유저의 (stockCountHistory[idx] × 등급배수) 합산하여 가격 변동
   *
   * @param stockId 주식 게임 ID
   * @param company 종목명
   * @param idx 현재 라운드 인덱스
   */
  private async updateV2StockPrice(stockId: string, company: string, idx: number): Promise<void> {
    const [stock, users] = await Promise.all([
      this.stockRepository.findOneById(stockId, { consistentRead: true }),
      this.userRepository.find({ stockId }, { consistentRead: true }),
    ]);

    if (!stock || !stock.gradeConfig) return;

    const { companies, gradeConfig } = stock;
    const companyInfo = companies[company];
    if (!companyInfo) return;

    // 다음 라운드 인덱스 유효성 체크
    const nextIdx = idx + 1;
    if (nextIdx > 9) return;

    const currentPrice = companyInfo[idx].가격;
    const playerCount = users.length;

    /**
     * 고정비율에 가장 가까운 100원 단위 가격 계산
     * @param prevPrice 이전 라운드 가격
     * @param targetPercent 목표 변동률 (양수: 상승, 음수: 하락)
     * @returns 100원 단위로 반올림된 새 가격 (최소 100원)
     */
    const roundToClosestPercentage = (prevPrice: number, targetPercent: number): number => {
      const exactPrice = prevPrice * (1 + targetPercent / 100);
      const floorPrice = Math.floor(exactPrice / 100) * 100;
      const ceilPrice = Math.ceil(exactPrice / 100) * 100;

      // 목표 변동률과의 차이가 작은 쪽 선택
      const absTarget = Math.abs(targetPercent);
      const floorPercent = Math.abs((floorPrice - prevPrice) / prevPrice) * 100;
      const ceilPercent = Math.abs((ceilPrice - prevPrice) / prevPrice) * 100;
      const floorDiff = Math.abs(floorPercent - absTarget);
      const ceilDiff = Math.abs(ceilPercent - absTarget);

      return Math.max(floorDiff <= ceilDiff ? floorPrice : ceilPrice, 100);
    };

    // ===== 모든 유저의 등급 계산 및 저장 =====
    const allUserAssets = users.map((user) => this.calculateUserTotalAsset(user, stock, idx));
    const userGradeUpdates: Promise<unknown>[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userAsset = allUserAssets[i];
      const grade = this.calculateGrade(userAsset, allUserAssets, gradeConfig);

      // 등급이 변경된 경우에만 업데이트
      if (user.grade !== grade) {
        userGradeUpdates.push(this.userRepository.updateOne({ stockId, userId: user.userId }, { grade }));
      }
    }

    // 등급 업데이트 비동기 실행 (가격 계산과 병렬 처리)
    if (userGradeUpdates.length > 0) {
      await Promise.all(userGradeUpdates).catch((err) => {
        console.error('[V2] 등급 업데이트 실패:', err);
      });
    }

    // 다음 라운드에 고정비율 이벤트가 있는지 확인
    const nextFixedFluctuation = companyInfo[nextIdx]?.fixedFluctuation;
    let nextRoundPrice: number;

    if (nextFixedFluctuation !== undefined) {
      // ===== 고정비율 이벤트 처리 =====
      // 현재 라운드의 '실제 가격'을 기준으로 고정비율 적용
      // (초기화 시점 가격이 아닌 게임 중 변동된 가격 기준)
      nextRoundPrice = roundToClosestPercentage(currentPrice, nextFixedFluctuation);
    } else {
      // ===== 일반 거래 가격 변동 계산 =====
      // 각 플레이어의 (순매수량 × 등급배수) 합산
      let weightedNetBuy = 0;
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const stockStorage = user.stockStorages.find((s) => s.companyName === company);
        if (!stockStorage) continue;

        // stockCountHistory[idx]는 해당 라운드의 순거래량 (매수 +, 매도 -)
        const netBuy = stockStorage.stockCountHistory[idx] ?? 0;

        // 해당 유저의 등급 계산 (이미 위에서 계산됨)
        const userAsset = allUserAssets[i];
        const grade = this.calculateGrade(userAsset, allUserAssets, gradeConfig);
        const multiplier = gradeConfig.multipliers[grade];

        weightedNetBuy += netBuy * multiplier;
      }

      // 가격 변동 계산
      // ChangeRate = (WeightedNetBuy × CurrentPrice) / (PlayerCount × 1,000,000) × 100
      const benchmark = playerCount * 1_000_000;
      const changeRate = ((weightedNetBuy * currentPrice) / benchmark) * 100;

      // 새 가격 계산
      nextRoundPrice = currentPrice * (1 + changeRate / 100);

      // 최저가 1,000원
      nextRoundPrice = Math.max(nextRoundPrice, 1000);

      // 100원 단위 반올림
      nextRoundPrice = Math.round(nextRoundPrice / 100) * 100;

      // 가격 상한 체크 (+50% 제한)
      const maxPrice = currentPrice * 1.5;
      nextRoundPrice = Math.min(nextRoundPrice, Math.round(maxPrice / 100) * 100);

      // 가격 하한 체크 (-50% 제한)
      const minPrice = currentPrice * 0.5;
      nextRoundPrice = Math.max(nextRoundPrice, Math.round(minPrice / 100) * 100);
    }

    // ===== 미래 라운드 가격 연쇄 재계산 =====
    // 현재 거래로 인해 다음 라운드 가격이 바뀌면,
    // 그 이후의 고정비율 이벤트들도 새로운 기준 가격으로 재계산해야 함
    const updatedCompanyInfo = [...companyInfo];

    // 다음 라운드 가격 업데이트
    updatedCompanyInfo[nextIdx] = {
      ...updatedCompanyInfo[nextIdx],
      가격: nextRoundPrice,
    };

    // 미래 라운드들의 고정비율 이벤트 가격 재계산
    let basePrice = nextRoundPrice;
    for (let futureIdx = nextIdx + 1; futureIdx <= 9; futureIdx++) {
      const futureFixedFluctuation = companyInfo[futureIdx]?.fixedFluctuation;

      if (futureFixedFluctuation !== undefined) {
        // 고정비율 이벤트: 직전 라운드 가격 기준으로 비율 적용
        const newFuturePrice = roundToClosestPercentage(basePrice, futureFixedFluctuation);
        updatedCompanyInfo[futureIdx] = {
          ...updatedCompanyInfo[futureIdx],
          가격: newFuturePrice,
        };
        basePrice = newFuturePrice;
      } else {
        // 이벤트 없는 라운드: 직전 라운드 가격 그대로 유지
        updatedCompanyInfo[futureIdx] = {
          ...updatedCompanyInfo[futureIdx],
          가격: basePrice,
        };
      }
    }

    const updatedCompanies = {
      ...companies,
      [company]: updatedCompanyInfo,
    };

    await this.stockRepository.updateOne(stockId, { companies: updatedCompanies });
  }

  async buyStock(
    stockId: string,
    body: Request.PostBuyStock,
    attributes?: { queueMessageId?: string },
  ): Promise<Response.Common> {
    const { userId, company, amount, idx: idxFromRequest, isChangeStockPrice = false } = body;

    try {
      // 필요한 데이터 조회
      const [stock, user] = await Promise.all([
        this.stockRepository.findOneById(stockId, { consistentRead: true }),
        this.userRepository.findOne({ stockId, userId }, { consistentRead: true }),
      ]);

      if (!stock) {
        throw new Error('스톡 정보를 불러올 수 없습니다');
      }

      if (stock.round !== body.round) {
        throw new Error('주식 라운드가 변경되었습니다. 다시 시도해주세요');
      }

      if (!stock.isTransaction) {
        throw new Error('지금은 거래할 수 없습니다');
      }

      if (!user) {
        throw new Error('유저 정보를 불러올 수 없습니다');
      }

      const { companies, remainingStocks } = stock;

      const companyInfo = companies[company];
      if (!companyInfo) {
        throw new Error('회사를 찾을 수 없습니다');
      }

      if (remainingStocks[company] !== null && remainingStocks[company] < amount) {
        throw new Error('시장에 주식이 없습니다');
      }

      const idx = Math.min(
        Math.floor(getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).minutes / stock.fluctuationsInterval),
        9,
      );
      const companyPrice = companyInfo[idx].가격;
      const totalPrice = companyPrice * amount;
      if (user.money < totalPrice) {
        throw new Error('돈이 부족합니다');
      }
      if (idx !== idxFromRequest) {
        throw new HttpException('턴이 변경되었습니다. 다시 시도해주세요', HttpStatus.CONFLICT);
      }

      const stockStorage = user.stockStorages.find((v) => v.companyName === company);
      if (!stockStorage) {
        throw new Error(`주식 보유 정보 ${company}를 불러올 수 없습니다`);
      }

      const companyCount = stockStorage.stockCountCurrent;

      // 평균 단가 업데이트 (기존 금액 * 기존 수량 + 현재 금액 * 구매 수량) / (기존 수량 + 구매 수량)
      const stockAveragePrice =
        (stockStorage.stockAveragePrice * stockStorage.stockCountCurrent + companyPrice * amount) /
        (stockStorage.stockCountCurrent + amount);

      const stockAveragePriceHistory = [...stockStorage.stockAveragePriceHistory];
      for (let i = idx; i < stockAveragePriceHistory.length; i++) {
        stockAveragePriceHistory[i] = stockAveragePrice;
      }

      // 주식 및 보유량 업데이트
      const updatedStockStorage = {
        ...stockStorage,
        stockAveragePrice,
        stockAveragePriceHistory,
        stockCountCurrent: companyCount + amount,
        stockCountHistory: [...stockStorage.stockCountHistory],
      };
      updatedStockStorage.stockCountHistory[idx] += amount;
      // 사용자 정보 업데이트
      const updatedStockStorages = user.stockStorages.map((storage) =>
        storage.companyName === company ? updatedStockStorage : storage,
      );

      // 남은 주식 업데이트
      const updatedRemainingStocks = { ...remainingStocks };
      if (updatedRemainingStocks[company] !== null) {
        updatedRemainingStocks[company] -= amount;
        if (updatedRemainingStocks[company] < 0) {
          updatedRemainingStocks[company] = 0;
        }
      }

      const moneyHistory = [...user.moneyHistory];
      for (let i = idx; i < moneyHistory.length; i++) {
        moneyHistory[i] = user.money - totalPrice;
      }

      const promise = [
        this.userRepository.updateOneWithAdd(
          { stockId, userId },
          {
            lastActivityTime: dayjs().toISOString(),
            moneyHistory,
            stockStorages: updatedStockStorages,
          },
          {
            money: -totalPrice,
          },
        ),
      ];

      if (isChangeStockPrice) {
        // 시장 영향 적용: 매수 후 가격 상승
        const newPrice = this.applyMarketImpact(companyPrice, 'BUY', amount);

        // 현재 시간 인덱스에 대해 가격 업데이트
        const updatedCompanyInfo = [...companyInfo];
        updatedCompanyInfo[idx] = {
          ...updatedCompanyInfo[idx],
          가격: newPrice,
        };

        const updatedCompanies = {
          ...companies,
          [company]: updatedCompanyInfo,
        };

        const updateStock = { remainingStocks: updatedRemainingStocks } as Partial<Stock>;
        updateStock.companies = updatedCompanies;

        promise.push(this.stockRepository.updateOne(stockId, updateStock));
      }

      await Promise.all(promise);

      switch (stock.gameMode) {
        case 'v2':
          await this.updateV2StockPrice(stockId, company, idx);
          break;
        default:
          break;
      }

      return {
        message: `주식을 ${amount}주 구매하였습니다.`,
        status: 200,
      };
    } catch (error) {
      console.error(error);

      return {
        message: `${error instanceof Error ? error.message : `${error}`}`,
        status: 500,
      };
    }
  }

  async sellStock(
    stockId: string,
    body: Request.PostSellStock,
    attributes?: { queueMessageId?: string },
  ): Promise<Response.Common> {
    const { userId, company, amount, idx: idxFromRequest, isChangeStockPrice = false } = body;

    try {
      // 필요한 데이터 조회
      const [stock, user] = await Promise.all([
        this.stockRepository.findOneById(stockId, { consistentRead: true }),
        this.userRepository.findOne({ stockId, userId }, { consistentRead: true }),
      ]);

      if (!stock) {
        throw new Error('스톡 정보를 불러올 수 없습니다');
      }

      if (stock.round !== body.round) {
        throw new Error('주식 라운드가 변경되었습니다. 다시 시도해주세요');
      }

      if (!user) {
        throw new Error('유저 정보를 불러올 수 없습니다');
      }

      if (!stock.isTransaction) {
        throw new Error('지금은 거래할 수 없습니다');
      }

      const { companies, remainingStocks } = stock;
      const companyInfo = companies[company];

      if (!companyInfo) {
        throw new HttpException('회사 정보를 불러올 수 없습니다', HttpStatus.CONFLICT);
      }

      const stockStorage = user.stockStorages.find((v) => v.companyName === company);
      if (!stockStorage) {
        throw new Error(`주식 보유 정보 ${company}를 불러올 수 없습니다`);
      }

      const companyCount = stockStorage.stockCountCurrent;
      if (companyCount < amount) {
        throw new HttpException('주식을 보유하고 있지 않습니다', HttpStatus.CONFLICT);
      }

      const idx = Math.min(
        Math.floor(getDateDistance(dayjs(stock.startedTime).toDate(), new Date()).minutes / stock.fluctuationsInterval),
        9,
      );
      const companyPrice = companyInfo[idx].가격;
      const totalPrice = companyPrice * amount;

      if (idx !== idxFromRequest) {
        throw new HttpException('턴이 변경되었습니다. 다시 시도해주세요', HttpStatus.CONFLICT);
      }

      // 필요한 로그 확인
      // const log = await this.logService.findOne({ queueId: attributes?.queueMessageId });

      // switch (log?.status) {
      //   case 'CANCEL':
      //     throw new Error('취소된 요청입니다');
      //   case 'FAILED':
      //     throw new Error('실패된 요청입니다');
      //   case 'SUCCESS':
      //     throw new Error('이미 처리된 요청입니다');
      //   default:
      // }

      // 평균 단가 업데이트 - 판매 후 보유 수량이 0이 되면 0으로 초기화, 보유 시 평균 단가 유지
      const stockAveragePrice = companyCount <= amount ? 0 : stockStorage.stockAveragePrice;

      const stockAveragePriceHistory = [...stockStorage.stockAveragePriceHistory];
      for (let i = idx; i < stockAveragePriceHistory.length; i++) {
        stockAveragePriceHistory[i] = stockAveragePrice;
      }

      // 주식 및 보유량 업데이트
      const updatedStockStorage = {
        ...stockStorage,
        stockAveragePrice,
        stockAveragePriceHistory,
        stockCountCurrent: companyCount - amount,
        stockCountHistory: [...stockStorage.stockCountHistory],
      };
      updatedStockStorage.stockCountHistory[idx] -= amount;

      // 사용자 정보 업데이트
      const updatedStockStorages = user.stockStorages.map((storage) =>
        storage.companyName === company ? updatedStockStorage : storage,
      );

      // 남은 주식 업데이트
      const updatedRemainingStocks = { ...remainingStocks };
      if (updatedRemainingStocks[company] !== null) {
        updatedRemainingStocks[company] += amount;
      }

      const moneyHistory = [...user.moneyHistory];
      for (let i = idx; i < moneyHistory.length; i++) {
        moneyHistory[i] = user.money + totalPrice;
      }

      const promise = [
        this.userRepository.updateOneWithAdd(
          { stockId, userId },
          {
            lastActivityTime: dayjs().toISOString(),
            moneyHistory,
            stockStorages: updatedStockStorages,
          },
          {
            money: totalPrice,
          },
        ),
      ];

      if (isChangeStockPrice) {
        // 시장 영향 적용: 매도 후 가격 하락
        const newPrice = this.applyMarketImpact(companyPrice, 'SELL', amount);

        // 현재 시간 인덱스에 대해 가격 업데이트
        const updatedCompanyInfo = [...companyInfo];
        updatedCompanyInfo[idx] = {
          ...updatedCompanyInfo[idx],
          가격: newPrice,
        };

        const updatedCompanies = {
          ...companies,
          [company]: updatedCompanyInfo,
        };

        const updateStock = { remainingStocks: updatedRemainingStocks } as Partial<Stock>;
        updateStock.companies = updatedCompanies;

        promise.push(this.stockRepository.updateOne(stockId, updateStock));
      }

      await Promise.all(promise);

      switch (stock.gameMode) {
        case 'v2':
          await this.updateV2StockPrice(stockId, company, idx);
          break;
        default:
          break;
      }

      return {
        message: `주식을 ${amount}주 판매하였습니다.`,
        status: 200,
      };
    } catch (error) {
      console.error(error);
      return {
        message: `${error instanceof Error ? error.message : `${error}`}`,
        status: 500,
      };
    }
  }
}
