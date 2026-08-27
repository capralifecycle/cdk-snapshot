import test from "node:test"
import { cdkTemplate, configureCdkSnapshots } from "../lib/node.js"
import { fixtureStack, options } from "./fixture.mjs"

configureCdkSnapshots()

test("parity", (t) => {
  t.assert.snapshot(cdkTemplate(fixtureStack(), options))
})
