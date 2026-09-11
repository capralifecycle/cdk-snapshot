import "../lib/jest.js"
import { emptyStack, fixtureStack, options } from "./fixture.mjs"

test("top level", () => {
  expect.assertions(1)
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
