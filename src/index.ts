import type { Stack } from "aws-cdk-lib"
import { Template } from "aws-cdk-lib/assertions"
import { normalize } from "./normalize.js"
import type { CdkTemplateOptions } from "./options.js"

export type { CdkTemplateOptions } from "./options.js"
export { anyObject } from "./placeholder.js"

/**
 * Synthesizes `stack` to a CloudFormation template with deployment noise
 * removed, ready to hand to a snapshot assertion.
 *
 * Bun users should import this from `@liflig/cdk-snapshot/bun` instead.
 */
export function cdkTemplate(
  stack: Stack,
  options: CdkTemplateOptions = {},
): Record<string, unknown> {
  return normalize(Template.fromStack(stack, {}).toJSON(), options)
}
