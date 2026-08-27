import { expect } from "vitest"
import { cdkTemplate } from "./index.js"
import { type ExpectLike, registerCdkMatcher } from "./matcher.js"
import type { CdkSnapshotOptions } from "./options.js"

export { cdkTemplate } from "./index.js"
export type { CdkSnapshotOptions, CdkTemplateOptions } from "./options.js"

declare module "vitest" {
  // Type parameters must match the upstream declaration exactly.
  // biome-ignore lint/suspicious/noExplicitAny: mirrors @vitest/expect
  interface Matchers<T = any> {
    toMatchCdkSnapshot(options?: CdkSnapshotOptions): T
  }
}

registerCdkMatcher(expect as unknown as ExpectLike, cdkTemplate)
