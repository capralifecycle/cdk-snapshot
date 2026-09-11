import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

/**
 * Each runner writes its own snapshot of the same stacks, under compat/. They
 * are compared here rather than by whichever runner happens to run last, so a
 * regeneration surfaces a difference instead of overwriting it.
 *
 * The runners record the same templates but lay the file out differently. Each
 * known difference is pinned by its own test, so a runner that changes its
 * format fails here and the table in the README is updated with it.
 */
const RUNNERS = ["bun", "jest", "node", "vitest"] as const
type Runner = (typeof RUNNERS)[number]

interface SnapshotFile {
  header: string | undefined
  entries: [key: string, body: string][]
}

function readSnapshotFile(runner: Runner): SnapshotFile {
  const path = new URL(
    `../compat/__snapshots__/${runner}.test.mjs.snap`,
    import.meta.url,
  )
  const text = readFileSync(path, "utf8")
  const firstLine = text.slice(0, text.indexOf("\n"))
  return {
    header: firstLine.startsWith("//") ? firstLine : undefined,
    entries: [...text.matchAll(/^exports\[`(.+?)`\] = `([\s\S]*?)`;$/gm)].map(
      ([, key, body]): [string, string] => {
        if (key === undefined || body === undefined) {
          throw new Error(`${runner}: unparseable snapshot entry`)
        }
        return [key, body]
      },
    ),
  }
}

const files = Object.fromEntries(
  RUNNERS.map((runner) => [runner, readSnapshotFile(runner)]),
) as Record<Runner, SnapshotFile>

const keys = (runner: Runner) => files[runner].entries.map(([key]) => key)

function body(runner: Runner, key: string): string {
  const entry = files[runner].entries.find(([k]) => k === key)
  if (!entry) throw new Error(`${runner} has no snapshot named "${key}"`)
  return entry[1]
}

/**
 * CommonJS Jest resolves the package through its `require` export condition
 * and loads the CommonJS build, which has to record exactly what ESM does.
 */
test("CommonJS Jest writes the same file as ESM Jest", () => {
  const read = (file: string) =>
    readFileSync(
      new URL(`../compat/__snapshots__/${file}`, import.meta.url),
    ).toString("utf8")

  expect(read("jest-cjs.test.cjs.snap")).toBe(read("jest.test.mjs.snap"))
})

test("each runner stamps its own header, except node:test", () => {
  const versions = RUNNERS.map((runner) => files[runner].header?.split(",")[0])

  expect(versions).toEqual([
    "// Bun Snapshot v1",
    "// Jest Snapshot v1",
    undefined,
    "// Vitest Snapshot v1",
  ])
})

test("Jest and Bun join describe and test names with a space, Vitest and node:test with ' > '", () => {
  expect(keys("bun")).toContain("suite nested 1")
  expect(keys("jest")).toContain("suite nested 1")
  expect(keys("node")).toContain("suite > nested 1")
  expect(keys("vitest")).toContain("suite > nested 1")
})

test("Bun writes entries in test order, the others sort them", () => {
  expect(keys("bun")).toEqual([
    "top level 1",
    "suite nested 1",
    "suite empty 1",
  ])
  for (const runner of ["jest", "node", "vitest"] as const) {
    expect(keys(runner)).toEqual([...keys(runner)].sort())
  }
})

test("node:test puts a single-line snapshot on a line of its own, the others inline it", () => {
  expect(body("node", "suite > empty 1")).toBe("\n{}\n")
  expect(body("bun", "suite empty 1")).toBe("{}")
  expect(body("jest", "suite empty 1")).toBe("{}")
  expect(body("vitest", "suite > empty 1")).toBe("{}")
})

test("Bun puts a nested multi-line string and the comma after it on lines of their own", () => {
  expect(body("bun", "top level 1")).toContain(
    '"Value": \n"#!/bin/bash\necho hello\n"\n,',
  )
  expect(body("jest", "top level 1")).toContain(
    '"Value": "#!/bin/bash\necho hello\n",',
  )
})

/** Undoes the differences pinned above, leaving only the templates themselves. */
function templates(runner: Runner): Record<string, string> {
  return Object.fromEntries(
    files[runner].entries.map(([key, body]) => [
      key.replaceAll(" > ", " "),
      body
        .replace(/^\n([^\n]*)\n$/, "$1")
        .replaceAll(' \n"', ' "')
        .replaceAll('"\n,', '",'),
    ]),
  )
}

test.each(["bun", "node", "vitest"] as const)(
  "%s records the same templates as Jest",
  (runner) => {
    expect(templates(runner)).toEqual(templates("jest"))
  },
)

/**
 * Parity between four empty snapshots would also be parity. These pin that the
 * fixture still reaches the normalizations it was built to exercise, so a CDK
 * change that stops emitting them fails here rather than passing silently.
 */
test("the compared snapshot exercises both maskings", () => {
  const snapshot = body("jest", "top level 1")

  expect(snapshot).toContain('"Code": Any<Object>')
  expect(snapshot).toMatch(/FnCurrentVersion[0-9A-F]{8}x{32}/)
})
