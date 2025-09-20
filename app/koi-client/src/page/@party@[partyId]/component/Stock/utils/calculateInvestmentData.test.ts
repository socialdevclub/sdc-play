import { describe, it, expect } from 'vitest';
import type { Response, StockSchemaWithId } from 'shared~type-stock';
import { StockConfig } from 'shared~config';
import { calculateInvestmentData } from './calculateInvestmentData';
import { MOCK_STOCK, MOCK_USER } from '../__mock__';

// 타입 호환성을 위한 헬퍼
const mockStock = MOCK_STOCK as unknown as StockSchemaWithId;
const mockUser = MOCK_USER as unknown as Response.GetStockUser;

describe('calculateInvestmentData', () => {
  it('0~9년차의 연차별 포트폴리오 구성 데이터를 정확히 계산해요', () => {
    const result = calculateInvestmentData(mockStock, mockUser);

    // 10개의 연차 데이터가 반환되는지 확인
    expect(result).toHaveLength(10);

    // 각 연차 데이터 구조 확인
    result.forEach((yearData, index) => {
      expect(yearData).toHaveProperty('year', `${index}년차`);
      expect(yearData).toHaveProperty('companies');
      expect(Array.isArray(yearData.companies)).toBe(true);
    });
  });

  it('0년차에는 모든 회사의 초기 투자 데이터와 현금을 반환해요', () => {
    const result = calculateInvestmentData(mockStock, mockUser);
    const year0Data = result[0];

    expect(year0Data.year).toBe('0년차');
    expect(year0Data.companies.length).toBeGreaterThan(0);

    // 각 회사의 데이터 구조 확인
    year0Data.companies.forEach((company) => {
      expect(company).toHaveProperty('name');
      expect(company).toHaveProperty('value');
      expect(typeof company.name).toBe('string');
      expect(typeof company.value).toBe('number');
      expect(company.value).toBeGreaterThanOrEqual(0);
    });

    // 현금이 포함되어 있는지 확인
    const cashEntry = year0Data.companies.find((company) => company.name === '현금');
    expect(cashEntry).toBeDefined();
    expect(cashEntry?.value).toBe(35100000); // mockUser.moneyHistory[0]

    // 실제 MOCK_USER의 주식 보유량 확인
    const qqqEntry = year0Data.companies.find((company) => company.name === 'QQQ');
    expect(qqqEntry).toBeDefined();
    expect(qqqEntry?.value).toBe(100 * 100000); // 100주 * 100,000원
  });

  it('8년차의 포트폴리오 구성을 정확히 계산해요', () => {
    const result = calculateInvestmentData(mockStock, mockUser);
    const lastYearData = result[8];

    expect(lastYearData.year).toBe('8년차');
    expect(lastYearData.companies).toBeDefined();

    // 보유 자산이 있는 경우 value가 양수여야 함
    lastYearData.companies.forEach((company) => {
      if (company.name !== '보유 자산 없음') {
        expect(company.value).toBeGreaterThan(0);
      }
    });

    // 8년차 현금 확인
    const cashEntry = lastYearData.companies.find((company) => company.name === '현금');
    expect(cashEntry).toBeDefined();
    expect(cashEntry?.value).toBe(11202000); // mockUser.moneyHistory[8]
  });

  it('연차별 현금 보유량 변화를 정확히 반영해요', () => {
    const result = calculateInvestmentData(mockStock, mockUser);

    // 각 연차별 현금 보유량 확인
    const expectedCashByYear = [
      35100000, 13975200, 15882500, 11295700, 14068100, 9828100, 7789600, 11282800, 11202000, 11202000,
    ];

    result.forEach((yearData, index) => {
      const cashEntry = yearData.companies.find((company) => company.name === '현금');
      expect(cashEntry).toBeDefined();
      expect(cashEntry?.value).toBe(expectedCashByYear[index]);
    });
  });

  it('빈 사용자 데이터에 대해 적절히 처리해요', () => {
    const emptyUser = {
      moneyHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      stockStorages: [],
    } as unknown as Response.GetStockUser;
    const result = calculateInvestmentData(mockStock, emptyUser);

    expect(result).toHaveLength(StockConfig.MAX_STOCK_IDX + 1);

    // 모든 연차에 대해 '보유 자산 없음' 상태여야 함
    result.forEach((yearData) => {
      expect(yearData.companies).toEqual([{ name: '보유 자산 없음', value: 1 }]);
    });
  });

  it('특정 회사만 거래한 경우 해당 회사 데이터와 현금을 포함해요', () => {
    const singleCompanyUser = {
      moneyHistory: [1000000, 900000, 800000, 700000, 600000, 500000, 400000, 300000, 200000, 100000],
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculateInvestmentData(mockStock, singleCompanyUser);
    const year0Data = result[0];

    expect(year0Data.companies).toHaveLength(11); // QQQ + 현금

    const qqqEntry = year0Data.companies.find((company) => company.name === 'QQQ');
    const cashEntry = year0Data.companies.find((company) => company.name === '현금');

    expect(qqqEntry?.value).toBe(100 * 100000); // 100주 * 100,000원
    expect(cashEntry?.value).toBe(1000000);
  });

  it('매도로 인해 보유량이 0이 된 회사는 포트폴리오에서 제외되지만 현금은 포함돼요', () => {
    const soldOutUser = {
      moneyHistory: [1000000, 2000000, 3000000, 2500000, 2000000, 1500000, 1000000, 500000, 100000, 50000],
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, -100, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculateInvestmentData(mockStock, soldOutUser);
    const year2Data = result[2];

    // 2년차에는 모든 주식을 매도했으므로 현금만 있어야 함
    expect(year2Data.companies).toHaveLength(11);
    expect(year2Data.companies[0].name).toBe('현금');
    expect(year2Data.companies[0].value).toBe(3000000);
  });

  it('실제 MOCK_USER 데이터로 QQQ 누적 보유량 변화를 확인해요', () => {
    const result = calculateInvestmentData(mockStock, mockUser);

    // QQQ stockCountHistory: [100, 30, 0, -4, -23, 0, 0, 0, -10, -93]
    // 누적 계산: [100, 130, 130, 126, 103, 103, 103, 103, 93, 0]

    const expectedQQQHoldings = [100, 130, 130, 126, 103, 103, 103, 103, 93];
    const qqqPrices = [100000, 115000, 138000, 125000, 135000, 115000, 148000, 175000, 185000];

    for (let i = 0; i < 9; i++) {
      const yearData = result[i];
      const qqqEntry = yearData.companies.find((company) => company.name === 'QQQ');

      if (expectedQQQHoldings[i] > 0) {
        expect(qqqEntry).toBeDefined();
        expect(qqqEntry?.value).toBe(expectedQQQHoldings[i] * qqqPrices[i]);
      } else {
        // 9년차에는 0주이므로 QQQ가 포트폴리오에 없어야 함
        expect(qqqEntry).toBeUndefined();
      }
    }
  });

  it('모든 자산을 매도하고 현금도 소진한 경우 빈 포트폴리오를 반환해요', () => {
    const bankruptUser = {
      moneyHistory: [1000000, 2000000, 0, 0, 0, 0, 0, 0, 0, 0],
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, -100, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculateInvestmentData(mockStock, bankruptUser);

    // 3년차부터는 주식도 현금도 없음
    for (let i = 2; i < 9; i++) {
      const yearData = result[i];
      expect(yearData.companies).toEqual([{ name: '보유 자산 없음', value: 1 }]);
    }
  });
});
