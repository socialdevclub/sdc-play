import { describe, it, expect } from 'vitest';
import {
  calculatePercentage,
  calculateChangeRate,
  formatPercentage,
  formatChangeRate,
  formatRatio,
} from './calculatePercentage';

describe('calculatePercentage', () => {
  it('기본 비율을 올바르게 계산해요', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
  });

  it('전체 값이 0일 때 0을 반환해요', () => {
    expect(calculatePercentage(10, 0)).toBe(0);
  });

  it('값이 0일 때 0을 반환해요', () => {
    expect(calculatePercentage(0, 100)).toBe(0);
  });

  it('100%를 초과하는 경우도 올바르게 계산해요', () => {
    expect(calculatePercentage(150, 100)).toBe(150);
  });
});

describe('calculateChangeRate', () => {
  it('양수 변화율을 올바르게 계산해요', () => {
    expect(calculateChangeRate(120, 100)).toBe(20);
    expect(calculateChangeRate(150, 100)).toBe(50);
  });

  it('음수 변화율을 올바르게 계산해요', () => {
    expect(calculateChangeRate(80, 100)).toBe(-20);
    expect(calculateChangeRate(50, 100)).toBe(-50);
  });

  it('변화가 없을 때 0을 반환해요', () => {
    expect(calculateChangeRate(100, 100)).toBe(0);
  });

  it('이전 값이 0일 때 0을 반환해요', () => {
    expect(calculateChangeRate(100, 0)).toBe(0);
  });

  it('소수점이 있는 변화율도 올바르게 계산해요', () => {
    expect(calculateChangeRate(110, 100)).toBe(10);
    expect(calculateChangeRate(105, 100)).toBe(5);
  });
});

describe('formatPercentage', () => {
  it('기본 옵션으로 퍼센트를 포맷팅해요', () => {
    expect(formatPercentage(25.5555)).toBe('25.56%');
    expect(formatPercentage(0)).toBe('0.00%');
  });

  it('소수점 자릿수를 지정할 수 있어요', () => {
    expect(formatPercentage(25.5555, { decimalPlaces: 0 })).toBe('26%');
    expect(formatPercentage(25.5555, { decimalPlaces: 1 })).toBe('25.6%');
    expect(formatPercentage(25.5555, { decimalPlaces: 3 })).toBe('25.555%');
  });

  it('양수 기호를 표시할 수 있어요', () => {
    expect(formatPercentage(25.5, { showSign: true })).toBe('+25.50%');
    expect(formatPercentage(-25.5, { showSign: true })).toBe('-25.50%');
    expect(formatPercentage(0, { showSign: true })).toBe('0.00%');
  });

  it('퍼센트 기호를 숨길 수 있어요', () => {
    expect(formatPercentage(25.5, { showPercent: false })).toBe('25.50');
  });

  it('옵션을 조합해서 사용할 수 있어요', () => {
    expect(
      formatPercentage(25.5555, {
        decimalPlaces: 1,
        showPercent: false,
        showSign: true,
      }),
    ).toBe('+25.6');
  });
});

describe('formatChangeRate', () => {
  it('변화율을 계산하고 포맷팅해요', () => {
    expect(formatChangeRate(120, 100)).toBe('+20.00%');
    expect(formatChangeRate(80, 100)).toBe('-20.00%');
    expect(formatChangeRate(100, 100)).toBe('0.00%');
  });

  it('소수점 자릿수를 지정할 수 있어요', () => {
    expect(formatChangeRate(110, 100, { decimalPlaces: 0 })).toBe('+10%');
    expect(formatChangeRate(105, 100, { decimalPlaces: 1 })).toBe('+5.0%');
  });

  it('이전 값이 0일 때도 올바르게 처리해요', () => {
    expect(formatChangeRate(100, 0)).toBe('0.00%');
  });
});

describe('formatRatio', () => {
  it('비율을 계산하고 포맷팅해요', () => {
    expect(formatRatio(25, 100)).toBe('25.00%');
    expect(formatRatio(50, 200)).toBe('25.00%');
    expect(formatRatio(1, 3)).toBe('33.33%');
  });

  it('소수점 자릿수를 지정할 수 있어요', () => {
    expect(formatRatio(1, 3, { decimalPlaces: 0 })).toBe('33%');
    expect(formatRatio(1, 3, { decimalPlaces: 4 })).toBe('33.3333%');
  });

  it('전체 값이 0일 때도 올바르게 처리해요', () => {
    expect(formatRatio(10, 0)).toBe('0.00%');
  });

  it('값이 0일 때도 올바르게 처리해요', () => {
    expect(formatRatio(0, 100)).toBe('0.00%');
  });
});
