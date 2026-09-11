import { expect, test } from "bun:test"
import { App, Stack } from "aws-cdk-lib"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { cdkTemplate } from "../src/bun.js"
import {
  type ExpectLike,
  registerCdkMatcher,
  requireExpect,
} from "../src/matcher.js"
import type { CdkSnapshotOptions } from "../src/options.js"
import { anyObject } from "../src/placeholder.js"
import "../src/bun.js"

function stack(): Stack {
  const app = new App()
  const scope = new Stack(app, "Stack", {
    env: { account: "112233445566", region: "eu-west-1" },
  })
  new Bucket(scope, "Bucket", { bucketName: "matcher-bucket" })
  return scope
}

type Matcher = (received: Stack, options?: CdkSnapshotOptions) => unknown

/**
 * Drives the matcher through a stand-in `expect` to capture the value it hands
 * to the snapshot assertion, which is otherwise swallowed by the runner.
 */
function captureSnapshotArgument(
  received: Stack,
  options?: CdkSnapshotOptions,
): unknown {
  return captureSnapshotCall(received, options).value
}

function captureSnapshotCall(
  received: Stack,
  options?: CdkSnapshotOptions,
): { value: unknown; propertyMatchers: unknown } {
  let captured: unknown
  let propertyMatchers: unknown
  let matcher: Matcher | undefined

  const fakeExpect = Object.assign(
    (actual: unknown) => ({
      toMatchSnapshot: (matchers?: Record<string, unknown>) => {
        captured = actual
        propertyMatchers = matchers
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
  return { value: captured, propertyMatchers }
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

/**
 * jest-cdk-snapshot calls the snapshot matcher directly, so `expect.assertions`
 * sees one assertion per call; the nested `expect` here must not add a second.
 */
test("counts as one assertion where the runner tracks assertion calls", () => {
  const state = { assertionCalls: 0 }
  let matcher: Matcher | undefined
  const fakeExpect: ExpectLike = Object.assign(
    (_actual: unknown) => ({
      toMatchSnapshot: () => {
        state.assertionCalls++
      },
    }),
    {
      extend: (matchers: Record<string, unknown>) => {
        matcher = matchers.toMatchCdkSnapshot as Matcher
      },
      getState: () => ({ ...state }),
      setState: (next: { assertionCalls: number }) => {
        Object.assign(state, next)
      },
    },
  )
  registerCdkMatcher(fakeExpect, cdkTemplate)

  state.assertionCalls = 1
  matcher?.call({}, stack())

  expect(state.assertionCalls).toBe(1)
})

test("negating the matcher is refused", () => {
  expect(() => expect(stack()).not.toMatchCdkSnapshot()).toThrow(
    "cannot be negated",
  )
})

const rejected: [label: string, injected: unknown][] = [
  ["nothing", undefined],
  ["a non-extendable expect", () => undefined],
  ["a non-function extend", { extend: "no" }],
]

test.each(rejected)(
  "explains what to do when the runner injected %s",
  (_label, injected) => {
    expect(() => requireExpect("Jest", injected)).toThrow(
      "Jest did not inject a global `expect`",
    )
  },
)

test("accepts an expect that can be extended", () => {
  const injected = Object.assign(() => undefined, { extend: () => undefined })

  expect(requireExpect("Jest", injected)).toBe(
    injected as unknown as ExpectLike,
  )
})

/**
 * jest-cdk-snapshot forwards propertyMatchers to the snapshot assertion, and a
 * project migrating from it keeps working only if these arrive there too - the
 * documented workaround of snapshotting cdkTemplate() by hand would change the
 * snapshot key.
 */
test("forwards property matchers to the snapshot assertion", () => {
  const propertyMatchers = { Resources: anyObject }

  const call = captureSnapshotCall(stack(), {
    subsetResourceTypes: ["AWS::S3::Bucket"],
    propertyMatchers,
  })

  expect(call.propertyMatchers).toBe(propertyMatchers)
})

test("omits property matchers entirely when none were given", () => {
  expect(captureSnapshotCall(stack(), {}).propertyMatchers).toBeUndefined()
})

test("keeps property matchers out of the normalized template", () => {
  const call = captureSnapshotCall(stack(), {
    propertyMatchers: { Resources: anyObject },
  })

  expect(call.value).toEqual(cdkTemplate(stack()))
})

test("property matchers reach the runner's own snapshot assertion", () => {
  expect(stack()).toMatchCdkSnapshot({
    subsetResourceTypes: ["AWS::S3::Bucket"],
    propertyMatchers: { Resources: expect.any(Object) },
  })
})
