export interface KeyboardShortcut {
  key: string;
  description: string;
  category: 'game' | 'display' | 'system';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Game controls
  { category: 'game', description: '시작 시간 초기화', key: 'y' },
  { category: 'game', description: '거래 활성화/비활성화', key: 't' },
  { category: 'game', description: '게임 종료 (RESULT 전환)', key: 'e' },

  // Display controls
  { category: 'display', description: '잔여 주식 수량 표시 토글', key: 'r' },
  { category: 'display', description: '거래 피드 표시 토글', key: 'f' },
  { category: 'display', description: 'QR코드 토글 (게임 중)', key: 'q' },

  // System
  { category: 'system', description: '단축키 도움말', key: '?' },
];

export const CATEGORY_LABELS: Record<KeyboardShortcut['category'], string> = {
  display: '화면 표시',
  game: '게임 제어',
  system: '시스템',
};
