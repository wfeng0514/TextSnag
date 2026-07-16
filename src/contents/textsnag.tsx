import { useCallback, useEffect, useState } from 'react';
import type { PlasmoCSConfig, PlasmoGetRootContainer, PlasmoGetStyle } from 'plasmo';
import SelectionOverlay from '../components/SelectionOverlay';
import ResultPopover from '../components/ResultPopover';
import { extractText } from '../lib/extractor';
import type { SelectionRect } from '../lib/extractor';
// Import CSS as text for injection into the page DOM
import cssText from 'bundle-text:./styles.css';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
};

/**
 * Render directly in the page DOM instead of Plasmo's Shadow DOM.
 *
 * Shadow DOM breaks `position: fixed` — the browser positions fixed elements
 * relative to the shadow root instead of the viewport, causing coordinate
 * mismatch between mouse events (viewport-relative) and overlay layout.
 *
 * NOTE: CSS must be injected into <head>, NOT the container div, because
 * React's root.render() replaces the container's entire content.
 */
export const getRootContainer: PlasmoGetRootContainer = () => {
  // Inject CSS into <head> so it survives React's root.render()
  if (!document.getElementById('textsnag-styles')) {
    const style = document.createElement('style');
    style.id = 'textsnag-styles';
    style.textContent = cssText;
    document.head.appendChild(style);
  }

  const container = document.createElement('div');
  container.id = 'textsnag-app';
  document.documentElement.appendChild(container);
  return container;
};

/**
 * Fallback: inject styles into Shadow DOM if Plasmo ever falls back to it.
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
