import { describe, it, expect } from 'vitest';
import type { Response, StockSchemaWithId } from 'shared~type-stock';
import { calculateTotalReturnsData } from './calculateTotalReturnsData';
import { MOCK_STOCK, MOCK_USER } from '../__mock__';

// 타입 호환성을 위한 헬퍼
const mockStock = MOCK_STOCK as unknown as StockSchemaWithId;
const mockUser = MOCK_USER as unknown as Response.GetStockUser;

describe('calculateTotalReturnsData', () => {
  it('0~9년차의 전체 포트폴리오 수익률 데이터를 정확히 계산해요', () => {
    const result = calculateTotalReturnsData(mockStock, mockUser);

    expect(result).toHaveProperty('returns');
    expect(result).toHaveProperty('years');
    expect(Array.isArray(result.returns)).toBe(true);
    expect(Array.isArray(result.years)).toBe(true);

    // 10개의 연차 데이터가 있어야 함 (0년차~9년차)
    expect(result.returns).toHaveLength(10);
    expect(result.years).toHaveLength(10);

    // 각 연차 라벨 확인
    result.years.forEach((year, index) => {
      expect(year).toBe(`${index}년차`);
    });

    // 각 수익률이 숫자이고 유한한 값이어야 함
    result.returns.forEach((returnRate) => {
      expect(typeof returnRate).toBe('number');
      expect(Number.isFinite(returnRate)).toBe(true);
    });
  });

  it('0년차의 수익률은 0이어야 해요', () => {
    const result = calculateTotalReturnsData(mockStock, mockUser);

    // 0년차에는 초기 투자만 있고 시간이 지나지 않았으므로 수익률은 0
    expect(result.returns[0]).toBe(0);
  });

  it('시간이 지남에 따른 수익률 변화를 반영해요', () => {
    const result = calculateTotalReturnsData(mockStock, mockUser);

    // 모든 수익률이 계산되어야 함
    result.returns.forEach((returnRate, index) => {
      expect(typeof returnRate).toBe('number');
      expect(Number.isFinite(returnRate)).toBe(true);
    });

    // 수익률은 시간에 따라 변할 수 있음
    const hasVariation = result.returns.some((rate, index) => index > 0 && rate !== result.returns[0]);
    expect(hasVariation).toBe(true);
  });

  it('빈 사용자 데이터에 대해 모든 수익률이 0이어야 해요', () => {
    const emptyUser = { stockStorages: [] } as unknown as Response.GetStockUser;
    const result = calculateTotalReturnsData(mockStock, emptyUser);

    expect(result.returns).toHaveLength(10);
    expect(result.years).toHaveLength(10);

    // 투자가 없으므로 모든 수익률이 0이어야 함
    result.returns.forEach((returnRate) => {
      expect(returnRate).toBe(0);
    });
  });

  it('단일 회사 투자의 수익률 추이를 정확히 계산해요', () => {
    const singleCompanyUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculateTotalReturnsData(mockStock, singleCompanyUser);

    expect(result.returns).toHaveLength(10);

    // 0년차: 수익률 0
    expect(result.returns[0]).toBe(0);

    // 1년차: 가격 변동에 따른 수익률
    // QQQ 가격: 100,000 → 115,000 (15% 상승)
    expect(result.returns[1]).toBe(15);

    // 2년차: QQQ 가격: 100,000 → 138,000 (38% 상승)
    expect(result.returns[2]).toBe(38);
  });

  it('매도 거래가 포함된 포트폴리오의 수익률을 정확히 계산해요', () => {
    const tradingUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, -50, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculateTotalReturnsData(mockStock, tradingUser);

    // 2년차에 매도가 있으므로 실현손익이 반영되어야 함
    expect(result.returns[2]).toBe(-12); // 이전 테스트에서 계산한 값
  });

  it('여러 회사 분산 투자의 종합 수익률을 계산해요', () => {
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

    const result = calculateTotalReturnsData(mockStock, diversifiedUser);

    // 1년차 분산 투자 수익률: 13.5% (이전 테스트에서 계산한 값)
    expect(result.returns[1]).toBe(13.5);
  });

  it('복잡한 거래 패턴의 장기 수익률 추이를 계산해요', () => {
    const complexUser = {
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 50, -30, 20, -40, 60, 0, 0, 0, 0],
        },
        {
          companyName: '금',
          stockCountHistory: [50, 25, -25, 30, 0, 0, 20, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculateTotalReturnsData(mockStock, complexUser);

    // 모든 연차의 수익률이 계산되어야 함
    result.returns.forEach((returnRate, index) => {
      expect(typeof returnRate).toBe('number');
      expect(Number.isFinite(returnRate)).toBe(true);
    });

    // 거래가 있는 연차들에서는 수익률이 변해야 함
    const hasComplexChanges = result.returns.some((rate, index) => index > 0 && Math.abs(rate) > 0);
    expect(hasComplexChanges).toBe(true);
  });

  it('존재하지 않는 회사 데이터는 무시하고 계산해요', () => {
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

    const result = calculateTotalReturnsData(mockStock, invalidCompanyUser);

    // 유효한 QQQ 투자만 반영되어야 함
    expect(result.returns[1]).toBe(15); // QQQ 1년차 수익률
  });

  it('연차와 수익률 배열의 길이가 일치해요', () => {
    const result = calculateTotalReturnsData(mockStock, mockUser);

    expect(result.returns.length).toBe(result.years.length);
    expect(result.returns.length).toBe(10);
  });

  it('극단적인 손실 상황도 정확히 계산해요', () => {
    const extremeLossUser = {
      stockStorages: [
        {
          companyName: '해삐코인', // 변동성이 큰 자산
          stockCountHistory: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculateTotalReturnsData(mockStock, extremeLossUser);

    // 9년차에는 해삐코인이 크게 하락 (100,000 → 8,000, -92%)
    expect(result.returns[9]).toBe(-92);
  });
});
