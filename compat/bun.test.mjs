import { describe, expect, test } from "bun:test"
import "../lib/bun.js"
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
