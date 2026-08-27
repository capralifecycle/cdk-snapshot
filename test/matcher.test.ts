import { expect, test } from "bun:test"
import { App, Stack } from "aws-cdk-lib"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { cdkTemplate } from "../src/bun.js"
import { type ExpectLike, registerCdkMatcher } from "../src/matcher.js"
import type { CdkTemplateOptions } from "../src/options.js"
import "../src/bun.js"

function stack(): Stack {
  const app = new App()
  const scope = new Stack(app, "Stack", {
    env: { account: "112233445566", region: "eu-west-1" },
  })
  new Bucket(scope, "Bucket", { bucketName: "matcher-bucket" })
  return scope
}

type Matcher = (received: Stack, options?: CdkTemplateOptions) => unknown

/**
 * Drives the matcher through a stand-in `expect` to capture the value it hands
 * to the snapshot assertion, which is otherwise swallowed by the runner.
 */
function captureSnapshotArgument(
  received: Stack,
  options?: CdkTemplateOptions,
): unknown {
  let captured: unknown
  let matcher: Matcher | undefined

  const fakeExpect = Object.assign(
    (actual: unknown) => ({
      toMatchSnapshot: () => {
        captured = actual
      },
    }),
    {
      extend: (matchers: Record<string, unknown>) => {
        matcher = matchers.toMatchCdkSnapshot as Matcher
      },
    },
  ) as ExpectLike

  registerCdkMatcher(fakeExpect, cdkTemplate)
  matcher?.call({}, received, options)
  return captured
}

test("snapshots exactly what cdkTemplate returns", () => {
  expect(captureSnapshotArgument(stack())).toEqual(cdkTemplate(stack()))
})

test("forwards its options to cdkTemplate", () => {
  const options = { subsetResourceTypes: ["AWS::S3::Bucket"] }

  expect(captureSnapshotArgument(stack(), options)).toEqual(
    cdkTemplate(stack(), options),
  )
})

test("options actually reach the normalizer", () => {
  const subset = captureSnapshotArgument(stack(), { subsetResourceTypes: [] })

  expect(subset).toEqual({ Resources: {} })
})

test("registers itself on the runner's expect", () => {
  expect(stack()).toMatchCdkSnapshot()
})

test("negating the matcher is refused", () => {
  expect(() => expect(stack()).not.toMatchCdkSnapshot()).toThrow(
    "cannot be negated",
  )
})
