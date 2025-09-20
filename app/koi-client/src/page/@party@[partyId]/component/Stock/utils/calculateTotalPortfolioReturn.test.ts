import { describe, it, expect } from 'vitest';
import type { Response, StockSchemaWithId } from 'shared~type-stock';
import { calculateTotalPortfolioReturn } from './calculateTotalPortfolioReturn';
import { MOCK_STOCK, MOCK_USER } from '../__mock__';

// 타입 호환성을 위한 헬퍼
const mockStock = MOCK_STOCK as unknown as StockSchemaWithId;
const mockUser = MOCK_USER as unknown as Response.GetStockUser;

describe('calculateTotalPortfolioReturn', () => {
  it('전체 포트폴리오의 수익률을 정확히 계산해요', () => {
    const returnRate = calculateTotalPortfolioReturn(mockStock, mockUser, 0);

    expect(typeof returnRate).toBe('number');
    expect(Number.isFinite(returnRate)).toBe(true);

    // 0년차에는 초기 투자만 있으므로 수익률은 0이어야 함
    expect(returnRate).toBe(0);
  });

  it('연차별 수익률 변화를 정확히 반영해요', () => {
    const year0Return = calculateTotalPortfolioReturn(mockStock, mockUser, 0);
    const year1Return = calculateTotalPortfolioReturn(mockStock, mockUser, 1);
    const year2Return = calculateTotalPortfolioReturn(mockStock, mockUser, 2);

    // 각 연차의 수익률이 계산되어야 함
    expect(typeof year0Return).toBe('number');
    expect(typeof year1Return).toBe('number');
    expect(typeof year2Return).toBe('number');

    // 모든 수익률이 유한한 값이어야 함
    expect(Number.isFinite(year0Return)).toBe(true);
    expect(Number.isFinite(year1Return)).toBe(true);
    expect(Number.isFinite(year2Return)).toBe(true);
  });

  it('빈 사용자 데이터에 대해 0을 반환해요', () => {
    const emptyUser = { stockStorages: [] } as unknown as Response.GetStockUser;
    const returnRate = calculateTotalPortfolioReturn(mockStock, emptyUser, 0);

    expect(returnRate).toBe(0);
  });

  it('투자가 없는 경우 0을 반환해요', () => {
    const noInvestmentUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const returnRate = calculateTotalPortfolioReturn(mockStock, noInvestmentUser, 5);

    expect(returnRate).toBe(0);
  });

  it('단일 회사 투자의 수익률을 정확히 계산해요', () => {
    const singleCompanyUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const year0Return = calculateTotalPortfolioReturn(mockStock, singleCompanyUser, 0);
    const year1Return = calculateTotalPortfolioReturn(mockStock, singleCompanyUser, 1);

    // 0년차: 초기 투자만 있으므로 수익률 0
    expect(year0Return).toBe(0);

    // 1년차: 가격 변동에 따른 수익률 계산
    // 투자액: 100주 * 100,000원 = 10,000,000원
    // 1년차 가치: 100주 * 115,000원 = 11,500,000원
    // 수익률: (11,500,000 - 10,000,000) / 10,000,000 * 100 = 15%
    expect(year1Return).toBe(15);
  });

  it('매도 거래가 포함된 FIFO 수익률을 정확히 계산해요', () => {
    const fifoUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, -50, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const year2Return = calculateTotalPortfolioReturn(mockStock, fifoUser, 2);

    // 2년차까지의 거래:
    // 0년차: 100주 매수 (100,000원/주)
    // 2년차: 50주 매도 (138,000원/주)
    // 실현손익: 50주 * (138,000 - 100,000) = 1,900,000원
    // 잔여 보유: 50주 * 138,000원 = 6,900,000원
    // 총 자산가치: 6,900,000 + 1,900,000 = 8,800,000원
    // 총 투자액: 100주 * 100,000원 = 10,000,000원
    // 수익률: (8,800,000 - 10,000,000) / 10,000,000 * 100 = -12%
    expect(year2Return).toBe(-12);
  });

  it('여러 회사에 분산 투자한 포트폴리오의 수익률을 계산해요', () => {
    const diversifiedUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          companyName: 'S&P500',
          stockCountHistory: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const year1Return = calculateTotalPortfolioReturn(mockStock, diversifiedUser, 1);

    // QQQ: 50주 * 100,000원 = 5,000,000원 → 50주 * 115,000원 = 5,750,000원
    // S&P500: 50주 * 100,000원 = 5,000,000원 → 50주 * 112,000원 = 5,600,000원
    // 총 투자액: 10,000,000원
    // 총 자산가치: 11,350,000원
    // 수익률: (11,350,000 - 10,000,000) / 10,000,000 * 100 = 13.5%
    expect(year1Return).toBe(13.5);
  });

  it('범위를 벗어난 연차에 대해 0을 반환해요', () => {
    const returnRate = calculateTotalPortfolioReturn(mockStock, mockUser, 20);

    expect(returnRate).toBe(0);
  });

  it('존재하지 않는 회사의 데이터는 무시해요', () => {
    const invalidCompanyUser = {
      stockStorages: [
        {
          companyName: 'INVALID_COMPANY',
          stockCountHistory: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const year1Return = calculateTotalPortfolioReturn(mockStock, invalidCompanyUser, 1);

    // 유효한 QQQ 투자만 계산되어야 함
    // QQQ 수익률: 15% (위에서 계산한 값과 동일)
    expect(year1Return).toBe(15);
  });

  it('수익률이 소수점 첫째 자리까지 반올림되어 반환돼요', () => {
    const testUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [33, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const year1Return = calculateTotalPortfolioReturn(mockStock, testUser, 1);

    // 소수점 첫째 자리까지만 있어야 함
    expect(Number.isInteger(year1Return * 10)).toBe(true);
  });
});
