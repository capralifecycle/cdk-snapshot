import type { Stack } from "aws-cdk-lib"
import { Template } from "aws-cdk-lib/assertions"
import { assetHashes } from "./assets.js"
import { normalize } from "./normalize.js"
import type { CdkTemplateOptions } from "./options.js"

export type { CdkSnapshotOptions, CdkTemplateOptions } from "./options.js"
export { anyObject } from "./placeholder.js"

/**
 * Synthesizes `stack` to a CloudFormation template with deployment noise
 * removed, ready to hand to a snapshot assertion.
 *
 * The stack is left untouched, so it can be synthesized again with different
 * options.
 *
 * Bun users should import this from `@liflig/cdk-snapshot/bun` instead.
 */
export function cdkTemplate(
  stack: Stack,
  options: CdkTemplateOptions = {},
): Record<string, unknown> {
  const template = Template.fromStack(stack).toJSON()
  const hashes = options.ignoreAssetHashes
    ? assetHashes(stack)
    : new Set<string>()
  return normalize(template, options, hashes)
}
