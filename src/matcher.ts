import type { Stack } from "aws-cdk-lib"
import type { CdkTemplateOptions } from "./options.js"

interface MatcherContext {
  isNot?: boolean
}

interface MatcherResult {
  pass: boolean
  message: () => string
}

/** The part of a runner's `expect` this matcher relies on. */
export interface ExpectLike {
  (actual: unknown): { toMatchSnapshot(): void }
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
      options: CdkTemplateOptions = {},
    ): MatcherResult {
      if (this?.isNot) {
        throw new Error("toMatchCdkSnapshot cannot be negated with `.not`.")
      }
      expect(cdkTemplate(received, options)).toMatchSnapshot()
      return { pass: true, message: () => "" }
    },
  })
}

/** Returns the `expect` a runner injects as a global. */
export function globalExpect(runner: string): ExpectLike {
  const injected = (globalThis as { expect?: ExpectLike }).expect
  if (typeof injected?.extend !== "function") {
    throw new Error(
      `@liflig/cdk-snapshot: ${runner} did not inject a global \`expect\`. Enable global injection, or use cdkTemplate() directly.`,
    )
  }
  return injected
}
