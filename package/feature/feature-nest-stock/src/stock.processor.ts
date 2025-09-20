import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import type { Request, Response } from 'shared~type-stock';
import { getDateDistance } from '@toss/date';
import dayjs from 'dayjs';
import { UserRepository } from './user/user.repository';
import { StockRepository } from './stock.repository';

@Injectable()
export class StockProcessor {
  constructor(
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    private readonly stockRepository: StockRepository,
  ) {}

  async buyStock(
    stockId: string,
    body: Request.PostBuyStock,
    attributes?: { queueMessageId?: string },
  ): Promise<Response.Common> {
    const { userId, company, amount, unitPrice } = body;

    try {
      // 필요한 데이터 조회
      const [stock, users] = await Promise.all([
        this.stockRepository.findOneById(stockId, { consistentRead: true }),
        this.userRepository.find({ stockId }, { consistentRead: true }),
      ]);
      const user = users.find((v) => v.userId === userId);

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
      if (companyPrice !== unitPrice) {
        throw new Error('주가가 변동되었습니다. 다시 시도해주세요');
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

      await Promise.all([
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
        // FIXME: 아래 코드 버그 있음
        // this.stockRepository.updateOneWithAdd(
        //   stockId,
        //   {},
        //   {
        //     [`remainingStocks.${company}`]: -amount,
        //   },
        // ),
        this.stockRepository.updateOne(stockId, { remainingStocks: updatedRemainingStocks }),
      ]);

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
    const { userId, company, amount, unitPrice } = body;

    try {
      // 필요한 데이터 조회
      const [stock, user] = await Promise.all([
        this.stockRepository.findOneById(stockId),
        this.userRepository.findOne({ stockId, userId }),
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

      if (companyPrice !== unitPrice) {
        throw new HttpException('주가가 변동되었습니다. 다시 시도해주세요', HttpStatus.CONFLICT);
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

      await Promise.all([
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
        // FIXME: 아래 코드 버그 있음
        // this.stockRepository.updateOneWithAdd(
        //   stockId,
        //   {},
        //   {
        //     [`remainingStocks.${company}`]: amount,
        //   },
        // ),
        this.stockRepository.updateOne(stockId, { remainingStocks: updatedRemainingStocks }),
      ]);

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
