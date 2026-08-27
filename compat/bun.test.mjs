import { expect, test } from "bun:test"
import "../lib/bun.js"
import { fixtureStack, options } from "./fixture.mjs"

test("parity", () => {
  expect(fixtureStack()).toMatchCdkSnapshot(options)
})
