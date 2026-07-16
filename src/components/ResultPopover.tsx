import { useCallback, useEffect, useRef, useState } from "react"
import type { SelectionRect } from "../lib/extractor"
import { tsn } from "../lib/tsn"

interface ResultPopoverProps {
  text: string
  anchorRect: SelectionRect
  onClose: () => void
}

export default function ResultPopover({
  text,
  anchorRect,
  onClose,
}: ResultPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  })

  // Calculate ideal position on mount
  useEffect(() => {
    if (!popoverRef.current) return

    const popover = popoverRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Preferred: below the selection, aligned to its right edge
    let left = anchorRect.right - popover.width
    let top = anchorRect.bottom + 10

    // Keep within viewport horizontally
    if (left < 10) left = 10
    if (left + popover.width > vw - 10) {
      left = vw - popover.width - 10
    }

    // If not enough space below, try above
    if (top + popover.height > vh - 10) {
      top = anchorRect.top - popover.height - 10
      if (top < 10) {
        // Still not enough — center vertically
        top = Math.max(10, (vh - popover.height) / 2)
      }
    }

    setPosition({ left, top })
  }, [anchorRect])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text for manual copy
      const textarea = popoverRef.current?.querySelector("textarea")
      if (textarea) {
        textarea.select()
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }, [text])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose()
      }
    }
    // Delay adding listener to avoid the mouseup that opened the popover from closing it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick)
    }, 200)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClick)
    }
  }, [onClose])

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!text) return null

  return (
    <div
      ref={popoverRef}
      id="textsnag-popover"
      className={tsn("ts-popover")}
      style={{ left: position.left, top: position.top }}>
      <div className={tsn("ts-popover-header")}>
        <span className={tsn("ts-popover-title")}>提取的文字</span>
        <button
          className={tsn("ts-popover-close")}
          onClick={onClose}
          aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <textarea
        className={tsn("ts-popover-text")}
        value={text}
        readOnly
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />

      <div className={tsn("ts-popover-footer")}>
        <span className={tsn("ts-popover-charcount")}>
          {text.length} 字符
        </span>
        <button
          className={tsn(
            "ts-popover-copy",
            copied && "ts-popover-copy--copied",
          )}
          onClick={handleCopy}>
          {copied ? "已复制 ✓" : "复制"}
        </button>
      </div>
    </div>
  )
}
