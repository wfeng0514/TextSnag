import { useEffect, useRef, useState } from "react"

/**
 * Makes an element draggable by a handle element within it.
 *
 * Usage:
 *   const nodeRef = useRef<HTMLDivElement>(null)
 *   const offset = useDrag(nodeRef, ".header")
 *   // apply: style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
 */
export function useDrag(
  nodeRef: React.RefObject<HTMLElement>,
  handleSelector?: string,
) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    // If a handle selector is given, only drag via that element.
    // Otherwise drag via the node itself.
    const handle = handleSelector
      ? (node.querySelector(handleSelector) as HTMLElement | null)
      : node
    if (!handle) return

    const onPointerDown = (e: PointerEvent) => {
      // Don't start drag on interactive children (buttons, inputs, etc.)
      const target = e.target as HTMLElement
      if (target.closest("button, input, textarea, select, a")) return

      e.preventDefault()
      handle.setPointerCapture?.(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.x
      const dy = e.clientY - dragRef.current.y
      dragRef.current = { x: e.clientX, y: e.clientY }
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    }

    const onPointerUp = () => {
      dragRef.current = null
    }

    handle.addEventListener("pointerdown", onPointerDown)
    handle.addEventListener("pointermove", onPointerMove)
    handle.addEventListener("pointerup", onPointerUp)
    handle.addEventListener("pointercancel", onPointerUp)

    return () => {
      handle.removeEventListener("pointerdown", onPointerDown)
      handle.removeEventListener("pointermove", onPointerMove)
      handle.removeEventListener("pointerup", onPointerUp)
      handle.removeEventListener("pointercancel", onPointerUp)
    }
  }, [nodeRef, handleSelector])

  return offset
}
