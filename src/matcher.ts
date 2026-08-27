import type { Stack } from "aws-cdk-lib"
import type { CdkSnapshotOptions, CdkTemplateOptions } from "./options.js"

interface MatcherContext {
  isNot?: boolean
}

interface MatcherResult {
  pass: boolean
  message: () => string
}

/** The part of a runner's `expect` this matcher relies on. */
export interface ExpectLike {
  (
    actual: unknown,
  ): {
    toMatchSnapshot(propertyMatchers?: Record<string, unknown>): void
  }
  extend(matchers: Record<string, unknown>): void
}

export type TemplateFn = (
  stack: Stack,
  options?: CdkTemplateOptions,
) => Record<string, unknown>

/**
 * Registers `toMatchCdkSnapshot` on the runner's `expect`.
 *
 * The matcher delegates to the runner's own snapshot assertion, so snapshots
 * keep the naming and format that runner already produces.
 */
export function registerCdkMatcher(
  expect: ExpectLike,
  cdkTemplate: TemplateFn,
): void {
  expect.extend({
    toMatchCdkSnapshot(
      this: MatcherContext,
      received: Stack,
      options: CdkSnapshotOptions = {},
    ): MatcherResult {
      if (this?.isNot) {
        throw new Error("toMatchCdkSnapshot cannot be negated with `.not`.")
      }
      const { propertyMatchers, ...templateOptions } = options
      const assertion = expect(cdkTemplate(received, templateOptions))
      if (propertyMatchers) {
        assertion.toMatchSnapshot(propertyMatchers)
      } else {
        assertion.toMatchSnapshot()
      }
      return { pass: true, message: () => "" }
    },
  })
}

/**
 * Narrows the `expect` a runner injected to the shape the matcher needs, or
 * explains what to do when the runner injected nothing.
 */
export function requireExpect(runner: string, injected: unknown): ExpectLike {
  const candidate = injected as ExpectLike | undefined
  if (typeof candidate?.extend !== "function") {
    throw new Error(
      `@liflig/cdk-snapshot: ${runner} did not inject a global \`expect\`. Enable global injection, or use cdkTemplate() directly.`,
    )
  }
  return candidate
}
