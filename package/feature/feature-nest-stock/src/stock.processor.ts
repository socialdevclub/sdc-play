import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import type { Request, Response } from 'shared~type-stock';
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

  private async updateDaltoStockPrice(stockId: string, company: string, idx: number): Promise<void> {
    const nextRound = idx + 1;
    if (company.includes('2배')) {
      return;
    }
    if (nextRound === 3 || nextRound === 6 || nextRound === 9) {
      return;
    }

    const promise = [];
    const updatedUserIds = new Set<string>();

    const [stock, users] = await Promise.all([
      this.stockRepository.findOneById(stockId, { consistentRead: true }),
      this.userRepository.find({ stockId }, { consistentRead: true }),
    ]);
    if (company !== '종합지수') {
      const totalStockCount = users.reduce((acc, user) => {
        const stockStorage = user.stockStorages.find((stockStorage) => stockStorage.companyName === company);
        return acc + stockStorage.stockCountHistory[idx];
      }, 0);
      // 다음 라운드 가격 업데이트 규칙
      // 현재 라운드 가격에서 totalStockCount 1% 만큼 증감
      if (idx % 3 !== 2) {
        stock.companies[company][idx + 1].가격 =
          Math.round((stock.companies[company][idx].가격 * (1 + totalStockCount * 0.01)) / 100) * 100;
        if (idx % 3 === 0) {
          stock.companies[company][idx + 2].가격 =
            Math.round((stock.companies[company][idx].가격 * (1 + totalStockCount * 0.01)) / 100) * 100;
        }
      }

      if (stock.companies[`${company} 2배`]) {
        if (idx % 3 !== 2) {
          stock.companies[`${company} 2배`][idx + 1].가격 =
            Math.round((stock.companies[`${company} 2배`][idx].가격 * (1 + totalStockCount * 0.02)) / 100) * 100;
          if (idx % 3 === 0) {
            stock.companies[`${company} 2배`][idx + 2].가격 =
              Math.round((stock.companies[`${company} 2배`][idx].가격 * (1 + totalStockCount * 0.02)) / 100) * 100;
          }
        }

        if (stock.companies[`${company} 2배`][idx + 1].가격 <= 0) {
          stock.companies[company][idx].가격 = stock.companies[company][idx + 1].가격;
          stock.companies[`${company} 2배`][idx + 1].가격 = stock.companies[`${company} 2배`][idx].가격;
          users.forEach((user) => {
            const stockStorage = user.stockStorages.find(
              (stockStorage) => stockStorage.companyName === `${company} 2배`,
            );
            if (stockStorage) {
              stockStorage.stockAveragePrice = 0;
              stockStorage.stockAveragePriceHistory[idx] = 0;
              stockStorage.stockCountCurrent = 0;
              stockStorage.stockCountHistory[idx] = 0;
              updatedUserIds.add(user.userId);
            }
          });
        }
        if (stock.companies[company][idx + 1].가격 <= 0) {
          stock.companies[company][idx].가격 = stock.companies[company][idx + 1].가격;
          users.forEach((user) => {
            const stockStorage = user.stockStorages.find((stockStorage) => stockStorage.companyName === company);
            if (stockStorage) {
              stockStorage.stockAveragePrice = 0;
              stockStorage.stockAveragePriceHistory[idx] = 0;
              stockStorage.stockCountCurrent = 0;
              stockStorage.stockCountHistory[idx] = 0;
              updatedUserIds.add(user.userId);
            }
          });
        }
      }
    }

    if (stock.companies['종합지수']) {
      const totalStockCount = users.reduce((acc, user) => {
        const stockCount = user.stockStorages.reduce((acc, stockStorage) => {
          if (stockStorage.companyName === '종합지수' || stockStorage.companyName.includes('2배')) {
            return acc;
          }
          return acc + stockStorage.stockCountCurrent;
        }, 0);
        return acc + stockCount;
      }, 0);
      if (idx % 3 !== 2) {
        stock.companies['종합지수'][idx + 1].가격 =
          Math.round((stock.companies['종합지수'][idx].가격 * (1 + totalStockCount * 0.01)) / 100) * 100;
        if (idx % 3 === 0) {
          stock.companies['종합지수'][idx + 2].가격 =
            Math.round((stock.companies['종합지수'][idx].가격 * (1 + totalStockCount * 0.01)) / 100) * 100;
        }
      }
      if (stock.companies['종합지수'][idx + 1].가격 <= 0) {
        stock.companies['종합지수'][idx].가격 = stock.companies['종합지수'][idx + 1].가격;
        users.forEach((user) => {
          const stockStorage = user.stockStorages.find((stockStorage) => stockStorage.companyName === '종합지수');
          if (stockStorage) {
            stockStorage.stockAveragePrice = 0;
            stockStorage.stockAveragePriceHistory[idx] = 0;
            stockStorage.stockCountCurrent = 0;
            stockStorage.stockCountHistory[idx] = 0;
            updatedUserIds.add(user.userId);
          }
        });
      }
    }
    promise.push(this.stockRepository.updateOne(stockId, { companies: stock.companies }));
    if (updatedUserIds.size > 0) {
      updatedUserIds.forEach((userId) => {
        const user = users.find((user) => user.userId === userId);
        if (user) {
          promise.push(this.userRepository.updateOne({ stockId, userId }, { stockStorages: user.stockStorages }));
        }
      });
    }
    await Promise.all(promise);
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

      if (stock.gameMode === 'dalto') {
        await this.updateDaltoStockPrice(stockId, company, idx);
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

      if (stock.gameMode === 'dalto') {
        await this.updateDaltoStockPrice(stockId, company, idx);
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
