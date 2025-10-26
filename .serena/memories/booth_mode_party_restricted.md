# Booth Mode - Party-Restricted Access Implementation

## Key Change
Modified booth mode to ONLY activate when accessing via party URL (QR code), not on general pages.

## Flow Logic
1. **No partyId in URL** → Normal login screen (standard auth flow)
2. **User logs in** → Can create party → Generate QR code at `/backoffice/screen/:partyId`
3. **QR code scan** → Access `/party/:partyId` → Booth mode activates → Guest/Login options

## Technical Implementation
```typescript
// Global.tsx - Line 137-139
const isPartyPage = window.location.pathname.startsWith('/party/');
const boothModeEnabled = isBoothMode() && isPartyPage;
```

## Benefits
- Prevents accidental booth mode activation on non-party pages
- Ensures proper party context for guest users
- Maintains normal auth flow for regular usage
- Clear separation between event mode and normal operation

## Testing URLs
- `http://localhost:5173/` → Normal login (no booth mode)
- `http://localhost:5173/party/abc123` → Booth mode entry (with PUBLIC_BOOTH_MODE=true)