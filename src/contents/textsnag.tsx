import { useCallback, useEffect, useState } from 'react';
import type { PlasmoCSConfig, PlasmoGetStyle } from 'plasmo';
import SelectionOverlay from '../components/SelectionOverlay';
import ResultPopover from '../components/ResultPopover';
import { extractText } from '../lib/extractor';
import type { SelectionRect } from '../lib/extractor';
// Import CSS as text for injection into Shadow DOM
import cssText from 'bundle-text:./styles.css';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
};

/**
 * Inject component styles into Plasmo's Shadow DOM.
 * Without this, the overlay renders invisible because
 * page-level CSS (from manifest) doesn't penetrate Shadow DOM.
 */
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

type Phase = 'idle' | 'selecting' | 'result';

export default function TextSnagApp() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<{
    text: string;
    rect: SelectionRect;
  } | null>(null);

  // Listen for messages from background script
  useEffect(() => {
    const listener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void,
    ) => {
      const msg = message as { type: string } | undefined;
      if (msg?.type === 'TOGGLE_SELECTION') {
        console.log('TextSnag: TOGGLE_SELECTION received');
        setPhase((prev) => {
          if (prev === 'idle') return 'selecting';
          return 'idle';
        });
        // Reset result when toggling off
        setResult(null);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    console.log('TextSnag: content script loaded, listening for messages');
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Global ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPhase('idle');
        setResult(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleSelectionComplete = useCallback((rect: SelectionRect) => {
    const text = extractText(rect);
    setResult({ text, rect });
    setPhase('result');
  }, []);

  const handleClose = useCallback(() => {
    setPhase('idle');
    setResult(null);
  }, []);

  if (phase === 'idle') return null;

  return (
    <>
      {phase === 'selecting' && (
        <SelectionOverlay onComplete={handleSelectionComplete} onCancel={handleClose} />
      )}
      {phase === 'result' && result && (
        <ResultPopover text={result.text} anchorRect={result.rect} onClose={handleClose} />
      )}
    </>
  );
}
