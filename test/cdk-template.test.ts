import { expect, test } from "bun:test"
import { App, Stack } from "aws-cdk-lib"
import {
  Code,
  Function as LambdaFunction,
  Runtime,
} from "aws-cdk-lib/aws-lambda"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { cdkTemplate } from "../src/bun.js"

const assetPath = new URL("./fixtures/asset", import.meta.url).pathname

function stackWithLambda(): Stack {
  const app = new App()
  const stack = new Stack(app, "Stack", {
    env: { account: "112233445566", region: "eu-west-1" },
  })
  new Bucket(stack, "Bucket")
  new LambdaFunction(stack, "Fn", {
    runtime: Runtime.NODEJS_22_X,
    handler: "index.handler",
    code: Code.fromAsset(assetPath),
  })
  return stack
}

test("synthesizes a stack without the bootstrap version parameter", () => {
  const template = cdkTemplate(stackWithLambda()) as Record<string, unknown>

  expect(template.Parameters).toBeUndefined()
  expect(template.Rules).toBeUndefined()
  expect(template.Resources).toBeDefined()
})

test("ignoreAssets hides the asset hash so the snapshot is stable", () => {
  expect(
    cdkTemplate(stackWithLambda(), { ignoreAssets: true }),
  ).toMatchSnapshot()
})
