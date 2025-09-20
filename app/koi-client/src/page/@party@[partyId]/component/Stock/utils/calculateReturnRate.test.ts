import { describe, it, expect, beforeEach } from 'vitest';
import { Response, StockSchemaWithId } from 'shared~type-stock';
import {
  calculateCompanyReturnRate,
  calculateAllCompaniesReturnRate,
  calculateCompanyAllRoundsReturnRate,
  calculateAllReturnRates,
  getBestPerformingCompany,
  getWorstPerformingCompany,
} from './calculateReturnRate';
import { MOCK_STOCK, MOCK_USER } from '../__mock__';

describe('calculateReturnRate', () => {
  let stock: StockSchemaWithId;
  let user: Response.GetStockUser;

  beforeEach(() => {
    stock = MOCK_STOCK as unknown as StockSchemaWithId;
    user = MOCK_USER as unknown as Response.GetStockUser;
  });

  describe('calculateCompanyReturnRate', () => {
    it('0라운드 수익률은 항상 null이에요', () => {
      // 0라운드는 기준점이므로 수익률이 null
      const result = calculateCompanyReturnRate(stock, user, 'QQQ', 0);
      expect(result).toBeNull();
    });

    it('QQQ의 1라운드 수익률을 올바르게 계산해요', () => {
      // QQQ: 0라운드 평균매수가격 100000, 1라운드 시장가격 115000
      // 수익률: (115000 - 100000) / 100000 * 100 = 15%
      const result = calculateCompanyReturnRate(stock, user, 'QQQ', 1);
      expect(result).toBe(15);
    });

    it('S&P500의 2라운드 수익률을 올바르게 계산해요', () => {
      // S&P500: 1라운드 평균매수가격 102905.26315789473, 2라운드 시장가격 128000
      // 수익률: (128000 - 102905.26315789473) / 102905.26315789473 * 100 ≈ 24.39%
      const result = calculateCompanyReturnRate(stock, user, 'S&P500', 2);
      expect(result).toBe(24.39);
    });

    it('비트코인의 4라운드 수익률을 올바르게 계산해요', () => {
      // 비트코인: 3라운드 평균매수가격 112467.53246753247, 4라운드 시장가격 420000
      // 수익률: (420000 - 112467.53246753247) / 112467.53246753247 * 100 ≈ 273.44%
      const result = calculateCompanyReturnRate(stock, user, '비트코인', 4);
      expect(result).toBe(273.44);
    });

    it('존재하지 않는 회사명으로 요청하면 null을 반환해요', () => {
      const result = calculateCompanyReturnRate(stock, user, '존재하지않는회사', 0);
      expect(result).toBeNull();
    });

    it('마지막 라운드(9라운드)도 수익률을 계산할 수 있어요', () => {
      // QQQ는 총 10개 라운드이므로, 9라운드(마지막)도 계산 가능
      const result = calculateCompanyReturnRate(stock, user, 'QQQ', 9);
      expect(result).not.toBeNull();
      expect(typeof result).toBe('number');
    });

    it('범위를 벗어난 라운드 인덱스는 null을 반환해요', () => {
      const result = calculateCompanyReturnRate(stock, user, 'QQQ', 100);
      expect(result).toBeNull();
    });
  });

  describe('calculateAllCompaniesReturnRate', () => {
    it('0라운드의 모든 회사 수익률은 0이에요', () => {
      const result = calculateAllCompaniesReturnRate(stock, user, 0);

      // 0라운드는 모든 회사가 null
      expect(result.QQQ).toBeUndefined();
      expect(result['S&P500']).toBeUndefined();
      expect(result['비트코인']).toBeUndefined();
    });

    it('1라운드의 모든 회사 수익률을 계산해요', () => {
      const result = calculateAllCompaniesReturnRate(stock, user, 1);

      // QQQ: (115000 - 100000) / 100000 * 100 = 15%
      expect(result.QQQ).toBe(15);

      // S&P500: (112000 - 100000) / 100000 * 100 = 12%
      expect(result['S&P500']).toBe(12);

      // 비트코인: (180000 - 100000) / 100000 * 100 = 80%
      expect(result['비트코인']).toBe(80);
    });

    it('마지막 라운드(9라운드)도 수익률을 계산해요', () => {
      const result = calculateAllCompaniesReturnRate(stock, user, 9);

      // 결과가 객체 형태인지 확인
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('calculateCompanyAllRoundsReturnRate', () => {
    it('QQQ의 모든 라운드 수익률을 계산해요', () => {
      const result = calculateCompanyAllRoundsReturnRate(stock, user, 'QQQ');

      // 총 10라운드이므로 10개의 결과가 나와야 함 (0~9 라운드 모두 포함)
      expect(result).toHaveLength(10);

      // 0라운드는 항상 null
      expect(result[0]).toBeNull();

      // 1라운드 수익률 확인
      expect(result[1]).toBe(15); // (115000 - 100000) / 100000 * 100
    });

    it('존재하지 않는 회사는 빈 배열을 반환해요', () => {
      const result = calculateCompanyAllRoundsReturnRate(stock, user, '존재하지않는회사');
      expect(result).toEqual([]);
    });
  });

  describe('calculateAllReturnRates', () => {
    it('모든 회사의 모든 라운드 수익률을 계산해요', () => {
      const result = calculateAllReturnRates(stock, user);

      // 결과가 객체 형태인지 확인
      expect(typeof result).toBe('object');

      // QQQ 데이터가 있는지 확인
      expect('QQQ' in result).toBe(true);
      expect(Array.isArray(result.QQQ)).toBe(true);

      // 각 회사의 결과가 10개인지 확인 (0~9 라운드)
      expect(result.QQQ).toHaveLength(10);

      // 0라운드는 모든 회사가 null
      expect(result.QQQ[0]).toBeNull();
    });
  });

  describe('getBestPerformingCompany', () => {
    it('0라운드에서는 모든 회사가 0%이므로 아무 회사나 반환해요', () => {
      const result = getBestPerformingCompany(stock, user, 0);

      expect(result).toBeNull();
    });

    it('1라운드에서 최고 수익률 회사를 찾아요', () => {
      const result = getBestPerformingCompany(stock, user, 1);

      expect(result).not.toBeNull();
      expect(result?.company).toBeDefined();
      expect(result?.rate).toBeGreaterThan(0);

      // 비트코인이 1라운드에서 80%로 가장 높을 것으로 예상
      expect(result?.company).toBe('비트코인');
      expect(result?.rate).toBe(80);
    });

    it('마지막 라운드(9라운드)에서도 수익률을 계산해요', () => {
      const result = getBestPerformingCompany(stock, user, 9);
      expect(result).not.toBeNull();
      expect(result?.company).toBeDefined();
      expect(typeof result?.rate).toBe('number');
    });
  });

  describe('getWorstPerformingCompany', () => {
    it('0라운드에서는 모든 회사가 null 이므로 아무 회사나 반환해요', () => {
      const result = getWorstPerformingCompany(stock, user, 0);

      expect(result).toBeNull();
    });

    it('1라운드에서 최저 수익률 회사를 찾아요', () => {
      const result = getWorstPerformingCompany(stock, user, 1);

      expect(result).not.toBeNull();
      expect(result?.company).toBeDefined();
      expect(typeof result?.rate).toBe('number');
    });

    it('마지막 라운드(9라운드)에서도 수익률을 계산해요', () => {
      const result = getWorstPerformingCompany(stock, user, 9);
      expect(result).not.toBeNull();
      expect(result?.company).toBeDefined();
      expect(typeof result?.rate).toBe('number');
    });
  });

  describe('실제 데이터 검증', () => {
    it('계산된 수익률이 합리적인 범위에 있어요', () => {
      const result = calculateAllReturnRates(stock, user);

      Object.entries(result).forEach(([company, rates]) => {
        rates.forEach((rate) => {
          if (rate !== null) {
            // 수익률이 -100% 이상이어야 함 (완전 손실 이하는 불가능)
            expect(rate).toBeGreaterThan(-100);
            // 수익률이 1000% 이하여야 함 (너무 극단적인 수익률 체크)
            expect(rate).toBeLessThan(1000);
          }
        });
      });
    });

    it('모든 회사의 첫 번째 라운드 수익률을 출력해봐요', () => {
      const result = calculateAllCompaniesReturnRate(stock, user, 1);

      console.log('=== 1라운드 모든 회사 수익률 ===');
      Object.entries(result).forEach(([company, rate]) => {
        console.log(`${company}: ${rate}%`);
      });

      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });
});
