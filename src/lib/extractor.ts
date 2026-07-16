/**
 * TextSnag — DOM Text Extraction with Smart Formatting
 *
 * Strategy:
 * 1. Find all visible text-bearing DOM nodes within the selection rectangle
 * 2. Walk the DOM in document order, collecting text with formatting rules:
 *    - Block-level elements: newline separator between siblings
 *    - Inline elements: concatenated directly
 *    - List items: prefixed with "• " and newline after
 *    - Images: alt text, or placeholder "[图片]" if no alt
 *    - Code blocks: preserved whitespace and newlines
 *    - Tables: cells joined by tabs, rows by newlines
 *    - Links: text only (no URL)
 *    - Hidden/offscreen elements: skipped entirely
 */

export interface SelectionRect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Tags whose default display is block-level */
const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "CANVAS", "DD", "DIV",
  "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM",
  "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN",
  "NAV", "NOSCRIPT", "OL", "P", "PRE", "SECTION", "TABLE", "TBODY",
  "TD", "TFOOT", "TH", "THEAD", "TR", "UL", "VIDEO",
])

const INLINE_TAGS = new Set([
  "A", "ABBR", "ACRONYM", "B", "BDO", "BIG", "BR", "BUTTON", "CITE",
  "CODE", "DFN", "EM", "I", "IMG", "INPUT", "KBD", "LABEL", "MAP",
  "OBJECT", "OUTPUT", "Q", "SAMP", "SCRIPT", "SELECT", "SMALL",
  "SPAN", "STRONG", "SUB", "SUP", "TEXTAREA", "TIME", "TT", "VAR",
])

/**
 * Check if a DOM node intersects the selection rectangle.
 * Uses element bounding rect for elements, and Range for text nodes.
 */
function nodeIntersectsRect(
  node: Node,
  rect: SelectionRect,
): boolean {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element
    const elRect = el.getBoundingClientRect()
    return !(
      elRect.right < rect.left ||
      elRect.left > rect.right ||
      elRect.bottom < rect.top ||
      elRect.top > rect.bottom
    )
  }
  if (node.nodeType === Node.TEXT_NODE) {
    // For text nodes, check the parent element
    const parent = node.parentElement
    if (!parent) return false
    return nodeIntersectsRect(parent, rect)
  }
  return false
}

/**
 * Check if an element is visible (not hidden by CSS, not zero-size, not offscreen).
 */
function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el)
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false
  }
  const bounds = el.getBoundingClientRect()
  return bounds.width > 0 && bounds.height > 0
}

/**
 * Get the computed display value for an element.
 */
function getDisplay(el: Element): string {
  return window.getComputedStyle(el).display
}

/**
 * Determine if an element behaves as a block-level element in the current layout.
 */
function isBlockLike(el: Element): boolean {
  const tag = el.tagName
  if (BLOCK_TAGS.has(tag)) return true
  if (INLINE_TAGS.has(tag)) return false
  const display = getDisplay(el)
  // Elements with these display values should start on a new line
  return (
    display.startsWith("block") ||
    display === "flex" ||
    display === "grid" ||
    display.startsWith("table") ||
    display === "list-item"
  )
}

/**
 * Extract text from a single element node with contextual formatting.
 */
function extractElement(
  el: Element,
  rect: SelectionRect,
): string {
  if (!isElementVisible(el)) return ""
  if (!nodeIntersectsRect(el, rect)) return ""

  const tag = el.tagName

  // Skip our own extension UI elements
  if (
    el.id === "textsnag-app" ||
    el.closest("#textsnag-overlay") ||
    el.closest("#textsnag-popover")
  ) {
    return ""
  }

  // Skip script/style/noscript content
  if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(tag)) {
    return ""
  }

  // Images → alt text or placeholder
  if (tag === "IMG") {
    const img = el as HTMLImageElement
    return img.alt?.trim() || "[图片]"
  }

  // Line breaks → newline
  if (tag === "BR") return "\n"

  // Horizontal rules → separator
  if (tag === "HR") return "\n———\n"

  // Code blocks → preserve internal format
  if (tag === "PRE") {
    const text = (el as HTMLPreElement).textContent ?? ""
    return "\n" + text + "\n"
  }

  // Process child nodes
  const parts: string[] = []
  const childNodes = el.childNodes

  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i]
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child as Text).textContent ?? ""
      if (text.trim()) {
        parts.push(text)
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element
      const childText = extractElement(childEl, rect)
      if (childText) {
        // Determine separator between consecutive children
        const prevIsBlock = i > 0 &&
          childNodes[i - 1].nodeType === Node.ELEMENT_NODE &&
          isBlockLike(childNodes[i - 1] as Element)
        const thisIsBlock = isBlockLike(childEl)

        if (thisIsBlock && parts.length > 0) {
          // Block-level child starts on new line
          if (childEl.tagName === "LI") {
            parts.push("\n• " + childText)
          } else {
            parts.push("\n" + childText)
          }
        } else {
          parts.push(childText)
        }
      }
    }
  }

  let result = parts.join("")

  // Post-processing: add trailing newline for block-level elements
  // (except when it's the outermost element we're processing)
  if (isBlockLike(el) && result) {
    result += "\n"
  }

  return result
}

/**
 * Collect all text-bearing elements within a rectangle and extract
 * their text with smart formatting.
 */
export function extractText(rect: SelectionRect): string {
  const root = document.documentElement
  if (!root) return ""

  // Strategy: walk the document tree from <html>, find all block-level
  // elements that intersect the rect, extract each one.
  const blocks: string[] = []

  function walk(el: Element) {
    if (!nodeIntersectsRect(el, rect)) return
    if (!isElementVisible(el)) return

    const tag = el.tagName
    // Skip our own overlay elements
    if (el.closest("#textsnag-overlay")) return

    // Skip non-content elements
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK"].includes(tag)) {
      return
    }

    const display = getDisplay(el)

    // For block-level elements, extract as a whole block
    if (isBlockLike(el)) {
      // Don't double-count: if a parent block already covers this, skip
      const parent = el.parentElement
      if (parent && isBlockLike(parent) && nodeIntersectsRect(parent, rect)) {
        // Parent covers the same area, so we'll get this content
        // when we process the parent. Skip this child.
        // UNLESS the parent doesn't fully contain this element's
        // rect (e.g. overflow), then process individually.
        const parentRect = parent.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        if (
          parentRect.top <= elRect.top &&
          parentRect.bottom >= elRect.bottom &&
          parentRect.left <= elRect.left &&
          parentRect.right >= elRect.right
        ) {
          // Parent fully contains — skip this one, let parent handle it
          return
        }
        // Partial overlap or overflow — process as standalone
      }

      const text = extractElement(el, rect).trim()
      if (text) {
        blocks.push(text)
      }
      // Don't recurse into children — extractElement handles them
      return
    }

    // For inline/leaf elements, recurse into children
    for (const child of el.children) {
      walk(child)
    }
  }

  walk(root)

  // Clean up the result
  let result = blocks.join("").trim()

  // Normalize whitespace:
  // - Collapse multiple blank lines to max 1
  result = result.replace(/\n{3,}/g, "\n\n")
  // - Remove trailing newline
  result = result.replace(/\n+$/, "")
  // - Remove leading newline
  result = result.replace(/^\n+/, "")

  return result
}
