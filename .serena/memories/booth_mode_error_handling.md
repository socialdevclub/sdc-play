# Booth Mode - Party Validation & Error Handling

## Implementation Summary
Added proper party existence validation to prevent confusion during booth operations.

## Key Components

### 1. PartyNotFound Component
- Clear error message: "파티를 찾을 수 없습니다"
- Informative description: "요청하신 파티가 존재하지 않거나 종료되었습니다"
- Action button: "홈으로 돌아가기" redirects to root
- Visual design: Purple gradient background with error icon

### 2. Party Validation Logic
```typescript
// Uses existing useQueryParty hook for validation
const { data: party, error } = Query.Party.useQueryParty(partyId, {
  refetchInterval: false,
  retry: false,
});

// Show error page if party doesn't exist
if (partyId && (error || (!party && error !== undefined))) {
  return <PartyNotFound />;
}
```

## User Flow
1. **Valid Party URL** → Booth mode entry (guest/login options)
2. **Invalid Party URL** → PartyNotFound error page
3. **No Party ID** → Normal login screen
4. **Error Recovery** → "홈으로 돌아가기" button

## Benefits for Booth Operations
- Clear communication when QR codes are invalid/expired
- Prevents confusion at events
- Quick recovery path to home screen
- Professional error handling for offline events

## Testing Verified
✅ Non-existent party shows error page
✅ Error message displays correctly
✅ Home button redirects properly
✅ Valid parties still work normally