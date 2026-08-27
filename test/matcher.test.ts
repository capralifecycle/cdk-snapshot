import { expect, test } from "bun:test"
import { App, Stack } from "aws-cdk-lib"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { cdkTemplate } from "../src/bun.js"
import "../src/bun"

function stack(): Stack {
  const app = new App()
  const scope = new Stack(app, "Stack", {
    env: { account: "112233445566", region: "eu-west-1" },
  })
  new Bucket(scope, "Bucket", { bucketName: "matcher-bucket" })
  return scope
}

test("the matcher produces what cdkTemplate produces", () => {
  expect(stack()).toMatchCdkSnapshot()
  expect(cdkTemplate(stack())).toMatchSnapshot()
})

test("the matcher forwards its options", () => {
  expect(stack()).toMatchCdkSnapshot({ subsetResourceTypes: [] })
})

test("negating the matcher is refused", () => {
  expect(() => expect(stack()).not.toMatchCdkSnapshot()).toThrow(
    "cannot be negated",
  )
})
