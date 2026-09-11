// Loads the package by name, so the `require` export condition is what
// resolves it, as it is for a CommonJS consumer.
require("@liflig/cdk-snapshot/jest")
const { emptyStack, fixtureStack, options } = require("./fixture.cjs")

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
