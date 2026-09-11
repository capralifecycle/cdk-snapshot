import { expect, test } from "bun:test"
import { App, Stack } from "aws-cdk-lib"
import { Template } from "aws-cdk-lib/assertions"
import {
  Code,
  Function as LambdaFunction,
  Runtime,
} from "aws-cdk-lib/aws-lambda"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { StringParameter } from "aws-cdk-lib/aws-ssm"
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

test("ignoreAssetHashes masks the hash and keeps the rest of the asset reference", () => {
  expect(
    cdkTemplate(stackWithLambda(), { ignoreAssetHashes: true }),
  ).toMatchSnapshot()
})

test("ignoreAssetHashes leaves a hash that belongs to no asset", () => {
  const stack = stackWithLambda()
  const digest = "c".repeat(64)
  new StringParameter(stack, "Digest", { stringValue: digest })

  const template = cdkTemplate(stack, { ignoreAssetHashes: true })

  expect(JSON.stringify(template)).toContain(digest)
  expect(JSON.stringify(template)).not.toMatch(/[0-9a-f]{64}\.zip/)
})

/**
 * `Template.fromStack` returns the assembly's cached template object rather
 * than a copy, so normalizing in place would leak into every later assertion
 * on the same stack.
 */
test("leaves the stack synthesizable again after a destructive option", () => {
  const stack = stackWithLambda()

  cdkTemplate(stack, { subsetResourceTypes: [] })

  expect(Object.keys(cdkTemplate(stack).Resources as object)).toContain(
    "Bucket83908E77",
  )
})

test("leaves the underlying template untouched for other assertions", () => {
  const stack = stackWithLambda()

  cdkTemplate(stack, { ignoreAssets: true, ignoreMetadata: true })

  Template.fromStack(stack).resourceCountIs("AWS::S3::Bucket", 1)
  expect(Template.fromStack(stack).toJSON().Parameters).toBeDefined()
})
