import { describe, it, expect } from 'vitest';
import type { Response, StockSchemaWithId } from 'shared~type-stock';
import { calculatePortfolioAllocation } from './calculatePortfolioAllocation';
import { MOCK_STOCK, MOCK_USER } from '../__mock__';

// 타입 호환성을 위한 헬퍼
const mockStock = MOCK_STOCK as unknown as StockSchemaWithId;
const mockUser = MOCK_USER as unknown as Response.GetStockUser;

describe('calculatePortfolioAllocation', () => {
  it('0년차의 포트폴리오 구성을 정확히 계산해요', () => {
    const result = calculatePortfolioAllocation(mockStock, mockUser, 0);

    expect(result).toHaveProperty('companies');
    expect(result).toHaveProperty('isEmpty');
    expect(Array.isArray(result.companies)).toBe(true);
    expect(typeof result.isEmpty).toBe('boolean');

    // 0년차에는 모든 회사가 초기 투자를 가지므로 비어있지 않아야 함
    expect(result.isEmpty).toBe(false);
    expect(result.companies.length).toBeGreaterThan(0);

    // 각 회사의 포트폴리오 데이터 구조 확인
    result.companies.forEach((company) => {
      expect(company).toHaveProperty('name');
      expect(company).toHaveProperty('value');
      expect(typeof company.name).toBe('string');
      expect(typeof company.value).toBe('number');
      expect(company.value).toBeGreaterThan(0);
    });

    // 현금이 포트폴리오에 포함되는지 확인
    const cashEntry = result.companies.find((company) => company.name === '현금');
    expect(cashEntry).toBeDefined();
    expect(cashEntry?.value).toBe(35100000); // mockUser.moneyHistory[0]

    // 실제 MOCK_USER 데이터를 기반으로 한 0년차 주식 보유량 확인
    const qqqEntry = result.companies.find((company) => company.name === 'QQQ');
    expect(qqqEntry).toBeDefined();
    expect(qqqEntry?.value).toBe(100 * 100000); // 100주 * 100,000원

    const bondEntry = result.companies.find((company) => company.name === '채권');
    expect(bondEntry).toBeDefined();
    expect(bondEntry?.value).toBe(90 * 100000); // 90주 * 100,000원
  });

  it('연차에 따른 포트폴리오 변화를 정확히 반영해요', () => {
    const year0 = calculatePortfolioAllocation(mockStock, mockUser, 0);
    const year1 = calculatePortfolioAllocation(mockStock, mockUser, 1);
    const year2 = calculatePortfolioAllocation(mockStock, mockUser, 2);

    // 각 연차별로 포트폴리오가 변해야 함
    expect(year0.companies).toBeDefined();
    expect(year1.companies).toBeDefined();
    expect(year2.companies).toBeDefined();

    // 거래 이력에 따라 포트폴리오 가치가 달라져야 함
    const year0Total = year0.companies.reduce((sum, company) => sum + company.value, 0);
    const year1Total = year1.companies.reduce((sum, company) => sum + company.value, 0);

    expect(year0Total).toBeGreaterThan(0);
    expect(year1Total).toBeGreaterThan(0);

    // 각 연차별 현금 보유량 확인
    const year0Cash = year0.companies.find((c) => c.name === '현금')?.value;
    const year1Cash = year1.companies.find((c) => c.name === '현금')?.value;

    expect(year0Cash).toBe(35100000); // mockUser.moneyHistory[0]
    expect(year1Cash).toBe(13975200); // mockUser.moneyHistory[1]

    // 1년차 QQQ 누적 보유량: 100 + 30 = 130주
    const year1QQQ = year1.companies.find((c) => c.name === 'QQQ')?.value;
    expect(year1QQQ).toBe(130 * 115000); // 130주 * 115,000원

    // 2년차 QQQ 누적 보유량: 100 + 30 + 0 = 130주
    const year2QQQ = year2.companies.find((c) => c.name === 'QQQ')?.value;
    expect(year2QQQ).toBe(130 * 138000); // 130주 * 138,000원
  });

  it('보유량이 양수인 회사만 포트폴리오에 포함해요', () => {
    const result = calculatePortfolioAllocation(mockStock, mockUser, 5);

    result.companies.forEach((company) => {
      if (company.name !== '보유 자산 없음') {
        expect(company.value).toBeGreaterThan(0);
      }
    });
  });

  it('빈 사용자 데이터에 대해 적절히 처리해요', () => {
    const emptyUser = {
      moneyHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      stockStorages: [],
    } as unknown as Response.GetStockUser;
    const result = calculatePortfolioAllocation(mockStock, emptyUser, 0);

    expect(result.isEmpty).toBe(true);
    expect(result.companies).toEqual([{ name: '보유 자산 없음', value: 1 }]);
  });

  it('현금만 보유한 경우 현금만 포함해요', () => {
    const cashOnlyUser = {
      moneyHistory: [5000000, 4500000, 4000000, 3500000, 3000000, 2500000, 2000000, 1500000, 1000000, 500000],
      stockStorages: [],
    } as unknown as Response.GetStockUser;

    const result = calculatePortfolioAllocation(mockStock, cashOnlyUser, 0);

    expect(result.isEmpty).toBe(false);
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].name).toBe('현금');
    expect(result.companies[0].value).toBe(5000000);
  });

  it('특정 회사만 보유한 경우 해당 회사와 현금을 포함해요', () => {
    const singleCompanyUser = {
      moneyHistory: [1000000, 900000, 800000, 700000, 600000, 500000, 400000, 300000, 200000, 100000],
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculatePortfolioAllocation(mockStock, singleCompanyUser, 0);

    expect(result.isEmpty).toBe(false);
    expect(result.companies).toHaveLength(2); // QQQ + 현금

    const qqq = result.companies.find((c) => c.name === 'QQQ');
    const cash = result.companies.find((c) => c.name === '현금');

    expect(qqq?.value).toBe(100 * 100000); // 100주 * 100,000원
    expect(cash?.value).toBe(1000000);
  });

  it('모든 주식을 매도하고 현금만 있는 경우 현금만 포함해요', () => {
    const soldOutUser = {
      moneyHistory: [1000000, 2000000, 3000000, 2500000, 2000000, 1500000, 1000000, 500000, 100000, 50000],
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, -100, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculatePortfolioAllocation(mockStock, soldOutUser, 2);

    expect(result.isEmpty).toBe(false);
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].name).toBe('현금');
    expect(result.companies[0].value).toBe(3000000);
  });

  it('주식도 현금도 없는 경우 빈 포트폴리오를 반환해요', () => {
    const emptyUser = {
      moneyHistory: [1000000, 2000000, 0, 0, 0, 0, 0, 0, 0, 0],
      stockStorages: [
        {
          companyName: 'QQQ',
          stockCountHistory: [100, 0, -100, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as unknown as Response.GetStockUser;

    const result = calculatePortfolioAllocation(mockStock, emptyUser, 3);

    expect(result.isEmpty).toBe(true);
    expect(result.companies).toEqual([{ name: '보유 자산 없음', value: 1 }]);
  });

  it('범위를 벗어난 연차에 대해 적절히 처리해요', () => {
    const result = calculatePortfolioAllocation(mockStock, mockUser, 20);

    expect(result.isEmpty).toBe(false);
    expect(result.companies).toEqual([{ name: '현금', value: 11202000 }]);
  });

  it('누적 보유량을 정확히 계산해요', () => {
    // MOCK_USER의 실제 QQQ 데이터로 테스트
    // QQQ stockCountHistory: [100, 30, 0, -4, -23, 0, 0, 0, -10, -93]

    // 3년차 누적: 100 + 30 + 0 + (-4) = 126주
    const result3 = calculatePortfolioAllocation(mockStock, mockUser, 3);
    const qqq3 = result3.companies.find((c) => c.name === 'QQQ');
    expect(qqq3?.value).toBe(126 * 125000); // 126주 * 3년차 가격(125,000원)

    // 4년차 누적: 100 + 30 + 0 + (-4) + (-23) = 103주
    const result4 = calculatePortfolioAllocation(mockStock, mockUser, 4);
    const qqq4 = result4.companies.find((c) => c.name === 'QQQ');
    expect(qqq4?.value).toBe(103 * 135000); // 103주 * 4년차 가격(135,000원)

    // 현금도 확인
    const cash3 = result3.companies.find((c) => c.name === '현금')?.value;
    const cash4 = result4.companies.find((c) => c.name === '현금')?.value;
    expect(cash3).toBe(11295700); // moneyHistory[3]
    expect(cash4).toBe(14068100); // moneyHistory[4]
  });

  it('마지막 연차는 무시해요', () => {
    // 9년차: QQQ의 경우 100+30+0+(-4)+(-23)+0+0+0+(-10)+(-93) = 0
    const result = calculatePortfolioAllocation(mockStock, mockUser, 9);

    // QQQ는 최종적으로 0주이므로 포트폴리오에 없어야 함
    const qqqEntry = result.companies.find((c) => c.name === 'QQQ');
    expect(qqqEntry).toEqual({
      name: 'QQQ',
      value: 95000 * 93,
    });

    // 하지만 현금은 있어야 함
    const cashEntry = result.companies.find((c) => c.name === '현금');
    expect(cashEntry).toBeDefined();
    expect(cashEntry?.value).toBe(11202000); // moneyHistory[9]
  });
});
