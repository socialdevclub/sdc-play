# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - generic [ref=e7]: "[plugin:vite:react-swc]"
    - generic [ref=e8]: "x Expected a semicolon ,-[/Users/hajeonghun/Projects/sdc-stock/app/koi-client/src/Global.tsx:85:1] 85 | const { data: party, error } = Query.Party.useQueryParty(partyId, { 86 | 87 | // Handle joining party for booth users after reload 88 | const { mutateAsync: joinParty } = Query.Party.useJoinParty(); : ^ 89 | 90 | useEffect(() => { 91 | // Check for pending join after reload `---- x Expected ',', got '{' ,-[/Users/hajeonghun/Projects/sdc-stock/app/koi-client/src/Global.tsx:85:1] 85 | const { data: party, error } = Query.Party.useQueryParty(partyId, { 86 | 87 | // Handle joining party for booth users after reload 88 | const { mutateAsync: joinParty } = Query.Party.useJoinParty(); : ^ 89 | 90 | useEffect(() => { 91 | // Check for pending join after reload `---- Caused by: Syntax Error"
  - generic [ref=e9]: /Users/hajeonghun/Projects/sdc-stock/app/koi-client/src/Global.tsx
  - generic [ref=e10]:
    - text: Click outside, press
    - generic [ref=e11]: Esc
    - text: key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e12]: server.hmr.overlay
    - text: to
    - code [ref=e13]: "false"
    - text: in
    - code [ref=e14]: vite.config.ts
    - text: .
```