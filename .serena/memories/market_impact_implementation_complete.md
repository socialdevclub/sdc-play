# 시장 영향 시스템 구현 완료
Date: 2025-10-30

## 구현 내용

### 1. 시장 영향 계산 로직
위치: `package/feature/feature-nest-stock/src/stock.processor.ts`

```typescript
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
```

### 2. 매수(buyStock) 수정
- 거래 성공 후 가격 상승 적용
- 현재 시간 인덱스 이후 모든 가격 업데이트
- DynamoDB에 새로운 가격 저장

### 3. 매도(sellStock) 수정  
- 거래 성공 후 가격 하락 적용
- "모두팔기" 포함 모든 매도에 적용
- amount에 비례한 시장 영향

## 핵심 규칙
- **영향도**: 주당 0.2% 선형 계산
- **최대 제한**: 단일 거래 30%
- **절대 하한선**: 100원
- **반올림**: 100원 단위 즉시 적용

## 게임플레이 영향
- 1주 거래: ±200원
- 50주 모두팔기: -10% (10,000원 하락)
- 150주 이상: ±30% 고정
- 100원 바닥: 더 이상 하락 불가

## 테스트 시나리오
`package/feature/feature-nest-stock/test/market-impact.test.ts`에 테스트 케이스 작성:
- 기본 거래 영향
- 최대 변동 제한
- 절대 하한선
- 100원 단위 반올림
- 실제 게임 시나리오

## 다음 단계
1. 프론트엔드에서 가격 변화 애니메이션 추가
2. 실제 15명 플레이 테스트
3. 필요시 파라미터 조정 (config 기반)