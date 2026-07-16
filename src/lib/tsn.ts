/**
 * TextSnag className helper.
 * Prefixes class names to avoid collisions with page CSS.
 * All TextSnag UI classes get the "ts-" prefix.
 */
export function tsn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ")
}
