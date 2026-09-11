import { describe, test } from "node:test"
import { cdkTemplate, configureCdkSnapshots } from "../lib/node.js"
import { emptyStack, fixtureStack, options } from "./fixture.cjs"

configureCdkSnapshots()

test("top level", (t) => {
  t.assert.snapshot(cdkTemplate(fixtureStack(), options))
})

describe("suite", () => {
  test("nested", (t) => {
    t.assert.snapshot(cdkTemplate(fixtureStack(), options))
  })

  test("empty", (t) => {
    t.assert.snapshot(cdkTemplate(emptyStack(), options))
  })
})
