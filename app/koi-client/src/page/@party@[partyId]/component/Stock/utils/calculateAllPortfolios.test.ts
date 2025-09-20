import { describe, it, expect } from 'vitest';
import { CompanyInfo, StockStorageSchema } from 'shared~type-stock';
import { calculateAllPortfolios } from './calculateAllPortfolios';
import { MOCK_STOCK, MOCK_USER } from '../__mock__';

describe('calculateAllPortfolios', () => {
  it('실제 프로덕션 Mock 데이터로 포트폴리오 계산이 올바르게 동작해야 해요', () => {
    const result = calculateAllPortfolios({
      companies: MOCK_STOCK.companies as unknown as Record<string, CompanyInfo[]>,
      stockStorages: MOCK_USER.stockStorages as unknown as StockStorageSchema[],
    });

    // QQQ 주식의 timeIdx 0 계산 검증
    // stockCountHistory[0] = 100주, 가격 = 100000원
    expect(result['0'].QQQ).toEqual({
      investmentPrice: 10000000,
      nextProfitRate: 15,

      nextStockPrice: 115000,
      // 100주 × 100000원
      stockCount: 100, // (115000-100000)/100000 * 100 = 15% → formatPercentage로 변환하면 15
    });

    // 채권의 timeIdx 0 계산 검증
    // stockCountHistory[0] = 90주, 가격 = 100000원
    expect(result['0']['채권']).toEqual({
      investmentPrice: 9000000,
      nextProfitRate: 5.5,

      nextStockPrice: 105500,
      // 90주 × 100000원
      stockCount: 90, // (105500-100000)/100000 * 100 = 5.5% → formatPercentage로 변환하면 5.5
    });

    // 해삐코인의 timeIdx 1 계산 검증
    // 누적 수량: 81 + 16 = 97주, 가격 = 170000원
    expect(result['1']['해삐코인']).toEqual({
      investmentPrice: 16490000,
      nextProfitRate: 76.5,

      nextStockPrice: 300000,
      // 97주 × 170000원
      stockCount: 97, // (300000-170000)/170000 * 100 ≈ 76.47% → formatPercentage로 변환하면 76.5
    });
  });

  it('실제 데이터에서 주식 수량이 0인 경우 수익률이 0%가 되어야 해요', () => {
    const result = calculateAllPortfolios({
      companies: MOCK_STOCK.companies as unknown as Record<string, CompanyInfo[]>,
      stockStorages: MOCK_USER.stockStorages as unknown as StockStorageSchema[],
    });

    // QQQ의 timeIdx 2에서 누적 수량 확인: 100 + 30 + 0 = 130주
    // timeIdx 2에서 stockCountHistory[2] = 0이지만, 누적은 130주
    expect(result['2'].QQQ.stockCount).toBe(130);
    expect(result['2'].QQQ.investmentPrice).toBe(17940000); // 130주 × 138000원

    // 채권의 timeIdx 2에서 누적 수량 확인: 90 + 30 + 0 = 120주
    expect(result['2']['채권'].stockCount).toBe(120);
    expect(result['2']['채권'].investmentPrice).toBe(12984000); // 120주 × 108200원
  });

  it('실제 데이터에서 음수 거래가 포함된 경우도 올바르게 계산되어야 해요', () => {
    const result = calculateAllPortfolios({
      companies: MOCK_STOCK.companies as unknown as Record<string, CompanyInfo[]>,
      stockStorages: MOCK_USER.stockStorages as unknown as StockStorageSchema[],
    });

    // QQQ의 timeIdx 3: 100 + 30 + 0 + (-4) = 126주
    expect(result['3'].QQQ).toEqual({
      investmentPrice: 15750000,
      nextProfitRate: 8,

      nextStockPrice: 135000,
      // 126주 × 125000원
      stockCount: 126, // (135000-125000)/125000 * 100 = 8% → formatPercentage로 변환하면 8
    });

    // 해삐코인의 timeIdx 2: 81 + 16 + (-17) = 80주
    expect(result['2']['해삐코인']).toEqual({
      investmentPrice: 24000000,
      nextProfitRate: -50,

      nextStockPrice: 150000,
      // 80주 × 300000원
      stockCount: 80, // (150000-300000)/300000 * 100 = -50% → formatPercentage로 변환하면 -50
    });
  });

  it('실제 데이터에서 마지막 시점(timeIdx 9)은 제외되어야 해요', () => {
    const result = calculateAllPortfolios({
      companies: MOCK_STOCK.companies as unknown as Record<string, CompanyInfo[]>,
      stockStorages: MOCK_USER.stockStorages as unknown as StockStorageSchema[],
    });

    // timeIdx 0~8까지만 있어야 하고, 9는 없어야 함
    expect(result).toHaveProperty('0');
    expect(result).toHaveProperty('8');
    expect(result).not.toHaveProperty('9');

    // 각 회사별로 timeIdx 8까지 데이터가 있는지 확인
    expect(result['8']).toHaveProperty('QQQ');
    expect(result['8']).toHaveProperty('채권');
    expect(result['8']).toHaveProperty('해삐코인');
  });

  it('실제 데이터에서 모든 회사의 포트폴리오가 계산되어야 해요', () => {
    const result = calculateAllPortfolios({
      companies: MOCK_STOCK.companies as unknown as Record<string, CompanyInfo[]>,
      stockStorages: MOCK_USER.stockStorages as unknown as StockStorageSchema[],
    });

    // MOCK_USER.stockStorages에 있는 모든 회사가 결과에 포함되어야 함
    const expectedCompanies = MOCK_USER.stockStorages.map((storage) => storage.companyName);

    expectedCompanies.forEach((companyName) => {
      expect(result['0']).toHaveProperty(companyName);
    });

    // 실제 회사들 확인
    expect(result['0']).toHaveProperty('QQQ');
    expect(result['0']).toHaveProperty('S&P500');
    expect(result['0']).toHaveProperty('TDF2060');
    expect(result['0']).toHaveProperty('금');
    expect(result['0']).toHaveProperty('미국달러SOFR');
    expect(result['0']).toHaveProperty('비트코인');
    expect(result['0']).toHaveProperty('원화 CMA');
    expect(result['0']).toHaveProperty('채권');
    expect(result['0']).toHaveProperty('코스피');
    expect(result['0']).toHaveProperty('해삐코인');
  });

  it('실제 데이터에서 극단적인 가격 변동 케이스를 테스트해야 해요', () => {
    const result = calculateAllPortfolios({
      companies: MOCK_STOCK.companies as unknown as Record<string, CompanyInfo[]>,
      stockStorages: MOCK_USER.stockStorages as unknown as StockStorageSchema[],
    });

    // 비트코인: timeIdx 0에서 1로 (100000 → 180000, 80% 상승)
    expect(result['0']['비트코인'].nextProfitRate).toBe(80); // 80% → formatPercentage로 변환하면 80

    // 해삐코인: timeIdx 8에서 9로 (90000 → 8000, 약 -91% 하락)
    const happiCoinTimeIdx8 = result['8']['해삐코인'];
    expect(happiCoinTimeIdx8.nextProfitRate).toBeCloseTo(-91.1, 1); // (8000-90000)/90000 * 100 ≈ -91.11%

    // 채권: timeIdx 8에서 9로 (108500 → 85000, 약 -21.7% 하락)
    const bondTimeIdx8 = result['8']['채권'];
    expect(bondTimeIdx8.nextProfitRate).toBeCloseTo(-21.7, 1); // (85000-108500)/108500 * 100 ≈ -21.66%
  });
});
