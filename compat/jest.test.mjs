import "../lib/jest.js"
import { fixtureStack, options } from "./fixture.mjs"

test("parity", () => {
  expect(fixtureStack()).toMatchCdkSnapshot(options)
})
