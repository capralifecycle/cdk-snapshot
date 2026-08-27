import { expect, test } from "vitest"
import "../lib/vitest.js"
import { fixtureStack, options } from "./fixture.mjs"

test("parity", () => {
  expect(fixtureStack()).toMatchCdkSnapshot(options)
})
