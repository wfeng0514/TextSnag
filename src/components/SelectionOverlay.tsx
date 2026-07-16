import { useCallback, useEffect, useRef, useState } from "react"
import type { SelectionRect } from "../lib/extractor"
import { tsn } from "../lib/tsn"

interface SelectionOverlayProps {
  onComplete: (rect: SelectionRect) => void
  onCancel: () => void
}

export default function SelectionOverlay({
  onComplete,
  onCancel,
}: SelectionOverlayProps) {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [end, setEnd] = useState<{ x: number; y: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Refs to avoid stale closures in mouse event handlers
  const startRef = useRef(start)
  startRef.current = start
  const endRef = useRef(end)
  endRef.current = end
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  const isSelecting = start !== null
  const rect = computeRect(start, end)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // left click only
    // Ignore clicks inside result popover
    if ((e.target as HTMLElement).closest("#textsnag-popover")) return
    e.preventDefault()
    setStart({ x: e.clientX, y: e.clientY })
    setEnd({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!startRef.current) return // not selecting
    e.preventDefault()
    setEnd({ x: e.clientX, y: e.clientY })
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const currentStart = startRef.current
    if (!currentStart) return
    const currentRect = computeRect(currentStart, endRef.current)
    if (!currentRect) return
    e.preventDefault()

    // Minimum selection size (10px) to prevent accidental tiny selections
    const width = currentRect.right - currentRect.left
    const height = currentRect.bottom - currentRect.top
    if (width < 10 || height < 10) {
      setStart(null)
      setEnd(null)
      return
    }

    onCompleteRef.current(currentRect)
  }, [])

  // Prevent scrolling and text selection during drag
  useEffect(() => {
    if (!isSelecting) return

    const prevOverflow = document.body.style.overflow
    const prevUserSelect = document.body.style.userSelect

    document.body.style.overflow = "hidden"
    document.body.style.userSelect = "none"

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.userSelect = prevUserSelect
    }
  }, [isSelecting])

  // ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (startRef.current) {
          setStart(null)
          setEnd(null)
        } else {
          onCancelRef.current()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown, true)
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [])

  return (
    <div
      ref={overlayRef}
      id="textsnag-overlay"
      className={tsn("ts-overlay")}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isSelecting ? "crosshair" : "crosshair" }}>
      {/* Guide text */}
      {!isSelecting && (
        <div className={tsn("ts-overlay-hint")}>
          拖拽选择要提取的文字区域
          <span className={tsn("ts-overlay-hint-esc")}>ESC 取消</span>
        </div>
      )}

      {/* Selection rectangle */}
      {rect && (
        <>
          {/* Top mask */}
          <div
            className={tsn("ts-mask")}
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: rect.top,
            }}
          />
          {/* Bottom mask */}
          <div
            className={tsn("ts-mask")}
            style={{
              top: rect.bottom,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left mask */}
          <div
            className={tsn("ts-mask")}
            style={{
              top: rect.top,
              left: 0,
              width: rect.left,
              height: rect.bottom - rect.top,
            }}
          />
          {/* Right mask */}
          <div
            className={tsn("ts-mask")}
            style={{
              top: rect.top,
              left: rect.right,
              right: 0,
              height: rect.bottom - rect.top,
            }}
          />
          {/* Selection border */}
          <div
            className={tsn("ts-selection")}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.right - rect.left,
              height: rect.bottom - rect.top,
            }}>
            <div className={tsn("ts-selection-size")}>
              {rect.right - rect.left} × {rect.bottom - rect.top}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function computeRect(
  start: { x: number; y: number } | null,
  end: { x: number; y: number } | null,
): SelectionRect | null {
  if (!start || !end) return null
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y),
  }
}
