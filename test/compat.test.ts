import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

/**
 * Each runner writes its own snapshot of the same stack, under compat/. They
 * are compared here rather than by whichever runner happens to run last, so a
 * regeneration surfaces a difference instead of overwriting it.
 */
const REFERENCE = "bun"
const OTHERS = ["jest", "node", "vitest"]

function snapshotBody(runner: string): string {
  const path = new URL(
    `../compat/__snapshots__/${runner}.test.mjs.snap`,
    import.meta.url,
  )
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("// ") || !line.includes("Snapshot v1"))
    .join("\n")
    .trim()
}

test.each(OTHERS)("%s writes the same snapshot as bun", (runner) => {
  expect(snapshotBody(runner)).toBe(snapshotBody(REFERENCE))
})
