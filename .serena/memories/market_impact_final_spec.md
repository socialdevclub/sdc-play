# 시장 영향 시스템 최종 사양
Date: 2025-10-30

## 확정된 정책

### 기본 규칙
- **영향도**: 주당 0.2% 선형 계산
- **단일 거래 제한**: 최대 30% 변동
- **절대 하한선**: 100원
- **가격 단위**: 100원 단위 즉시 반올림
- **미리보기**: 없음 (영향도 예측 표시 X)

### 구현 공식
```typescript
const applyMarketImpact = (
  currentPrice: number,
  action: 'BUY' | 'SELL',
  amount: number
): number => {
  // 1. 영향도 계산 (최대 30%)
  const impact = Math.min(amount * 0.002, 0.3);
  const finalImpact = action === 'BUY' ? impact : -impact;
  
  // 2. 새 가격 계산
  const newPrice = currentPrice * (1 + finalImpact);
  
  // 3. 하한선 적용 (100원)
  const boundedPrice = Math.max(100, newPrice);
  
  // 4. 100원 단위 반올림
  return Math.round(boundedPrice / 100) * 100;
};
```

### 예시
- 1주 거래: ±0.2% (100,000원 → 100,200원/99,800원)
- 50주 모두팔기: -10% (100,000원 → 90,000원)
- 150주 이상: ±30% 고정 (제한 적용)
- 하한선: 아무리 팔아도 100원 이하 불가

### 게임 디자인 의도
- 단순하고 예측 가능한 규칙
- 대량 보유자에게 힘과 책임 부여
- 극단적 시장 파괴 방지
- 바닥(100원)에서 안전한 매수 기회 제공

### 구현 위치
- Backend: `/stock/sell`, `/stock/buy` API에서 가격 업데이트 로직 추가
- Frontend: 이미 구현된 "모두팔기" 버튼 활용 (amount 전달)