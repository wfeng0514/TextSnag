/**
 * Post-build obfuscation for Chrome Web Store submission.
 * Obfuscates all JS files in the Plasmo build output.
 *
 * Run: node scripts/obfuscate.mjs
 */
import { readFile, writeFile, readdir, stat } from "node:fs/promises"
import { resolve, basename, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import JavaScriptObfuscator from "javascript-obfuscator"

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUILD_DIR = resolve(__dirname, "..", "build", "chrome-mv3-prod")

/** Recursively find all .js files under a directory */
async function findJsFiles(dir) {
  const results = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await findJsFiles(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath)
    }
  }
  return results
}

async function main() {
  const files = await findJsFiles(BUILD_DIR)

  if (files.length === 0) {
    console.log("⚠️  No JS files found. Run `npx plasmo build` first.")
    process.exit(1)
  }

  console.log(`🔒 Obfuscating ${files.length} file(s)...\n`)

  for (const filePath of files) {
    const relativePath = filePath.replace(BUILD_DIR, "build/chrome-mv3-prod")
    const originalCode = await readFile(filePath, "utf-8")
    const originalSize = Buffer.byteLength(originalCode, "utf-8")

    const result = JavaScriptObfuscator.obfuscate(originalCode, {
      // String encoding — masks string literals in the code
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayThreshold: 0.6,
      rotateStringArray: true,
      shuffleStringArray: true,

      // Identifier renaming — turns readable names into short hex
      identifierNamesGenerator: "hexadecimal",
      renameGlobals: false,       // keep Chrome API globals intact
      renameProperties: false,     // keep object property names intact

      // Control flow — light flattening (performance-sensitive code)
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.3,
      deadCodeInjection: false,

      // Anti-tamper — disabled to avoid CSP violations in extensions
      selfDefending: false,
      debugProtection: false,
      disableConsoleOutput: false,

      // Output
      compact: true,
      simplify: true,
      transformObjectKeys: false,
      unicodeEscapeSequence: false,
      numbersToExpressions: true,
      splitStrings: true,
      splitStringsChunkLength: 15,

      sourceMap: false,
      seed: 42,
    })

    const obfuscatedCode = result.getObfuscatedCode()
    const obfuscatedSize = Buffer.byteLength(obfuscatedCode, "utf-8")

    await writeFile(filePath, obfuscatedCode, "utf-8")

    const pct = ((obfuscatedSize / originalSize - 1) * 100).toFixed(0)
    console.log(`  ✅ ${relativePath}`)
    console.log(`     ${(originalSize / 1024).toFixed(1)} KB → ${(obfuscatedSize / 1024).toFixed(1)} KB (${pct > 0 ? "+" : ""}${pct}%)`)
  }

  console.log("\n🔒 Done.")
}

main().catch((err) => {
  console.error("❌ Obfuscation failed:", err.message)
  process.exit(1)
})
