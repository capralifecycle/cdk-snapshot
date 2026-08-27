import { expect } from "bun:test"
import type { Stack } from "aws-cdk-lib"
import { cdkTemplate as cdkTemplateCore } from "./index.js"
import { type ExpectLike, registerCdkMatcher } from "./matcher.js"
import type { CdkSnapshotOptions, CdkTemplateOptions } from "./options.js"

export type { CdkSnapshotOptions, CdkTemplateOptions } from "./options.js"

declare module "bun:test" {
  interface Matchers<T> {
    toMatchCdkSnapshot(options?: CdkSnapshotOptions): T
  }
}

/**
 * {@link cdkTemplateCore} with an asset placeholder Bun's serializer accepts.
 *
 * Bun recognizes only matchers created by its own `expect`.
 */
export function cdkTemplate(
  stack: Stack,
  options: CdkTemplateOptions = {},
): Record<string, unknown> {
  return cdkTemplateCore(stack, {
    assetPlaceholder: expect.any(Object),
    ...options,
  })
}

registerCdkMatcher(expect as unknown as ExpectLike, cdkTemplate)
