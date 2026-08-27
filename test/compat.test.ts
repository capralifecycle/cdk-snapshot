import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

/**
 * Each runner writes its own snapshot of the same stack, under compat/. They
 * are compared here rather than by whichever runner happens to run last, so a
 * regeneration surfaces a difference instead of overwriting it.
 */
const REFERENCE = "bun"
const OTHERS = ["jest", "node", "vitest"]

const isRunnerHeader = (line: string) =>
  line.startsWith("//") && line.includes("Snapshot v1")

function snapshotBody(runner: string): string {
  const path = new URL(
    `../compat/__snapshots__/${runner}.test.mjs.snap`,
    import.meta.url,
  )
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !isRunnerHeader(line))
    .join("\n")
    .trim()
}

test.each(OTHERS)("%s writes the same snapshot as bun", (runner) => {
  expect(snapshotBody(runner)).toBe(snapshotBody(REFERENCE))
})

/**
 * Parity between four empty snapshots would also be parity. These pin that the
 * fixture still reaches the normalizations it was built to exercise, so a CDK
 * change that stops emitting them fails here rather than passing silently.
 */
test("the compared snapshot exercises both maskings", () => {
  const body = snapshotBody(REFERENCE)

  expect(body).toContain('"Code": Any<Object>')
  expect(body).toMatch(/FnCurrentVersion[0-9A-F]{8}x{32}/)
})
