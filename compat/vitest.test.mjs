import { describe, expect, test } from "vitest"
import "../lib/vitest.js"
import { emptyStack, fixtureStack, options } from "./fixture.mjs"

test("top level", () => {
  expect(fixtureStack()).toMatchCdkSnapshot(options)
})

describe("suite", () => {
  test("nested", () => {
    expect(fixtureStack()).toMatchCdkSnapshot(options)
  })

  test("empty", () => {
    expect(emptyStack()).toMatchCdkSnapshot(options)
  })
})
