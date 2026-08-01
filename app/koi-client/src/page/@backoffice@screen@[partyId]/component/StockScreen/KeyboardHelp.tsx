import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { KEYBOARD_SHORTCUTS, CATEGORY_LABELS, KeyboardShortcut } from './keyboardShortcuts';

export default function KeyboardHelp() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleHelp = (event: KeyboardEvent) => {
      if (event.key === '?' || event.key === '/') {
        setIsVisible((prev) => !prev);
      }
      if (event.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', toggleHelp);

    return () => {
      document.removeEventListener('keydown', toggleHelp);
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const groupedShortcuts = KEYBOARD_SHORTCUTS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<KeyboardShortcut['category'], KeyboardShortcut[]>,
  );

  return (
    <Overlay onClick={() => setIsVisible(false)}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>키보드 단축키</Title>
        {(Object.keys(groupedShortcuts) as KeyboardShortcut['category'][]).map((category) => (
          <Section key={category}>
            <CategoryLabel>{CATEGORY_LABELS[category]}</CategoryLabel>
            {groupedShortcuts[category].map((shortcut) => (
              <ShortcutRow key={shortcut.key}>
                <KeyBadge>{shortcut.key}</KeyBadge>
                <Description>{shortcut.description}</Description>
              </ShortcutRow>
            ))}
          </Section>
        ))}
        <CloseHint>ESC 또는 아무 곳이나 클릭하여 닫기</CloseHint>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #1f2937;
  border-radius: 12px;
  padding: 32px;
  min-width: 400px;
  max-width: 90vw;
  border: 1px solid #374151;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h2`
  color: #ffffff;
  font-size: 24px;
  margin: 0 0 24px 0;
  text-align: center;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const CategoryLabel = styled.div`
  color: #9ca3af;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #374151;
`;

const ShortcutRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
`;

const KeyBadge = styled.span`
  background: #374151;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  min-width: 32px;
  text-align: center;
  border: 1px solid #4b5563;
`;

const Description = styled.span`
  color: #d1d5db;
  font-size: 14px;
`;

const CloseHint = styled.div`
  color: #6b7280;
  font-size: 12px;
  text-align: center;
  margin-top: 24px;
`;