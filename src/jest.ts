import { cdkTemplate } from "./index.js"
import { registerCdkMatcher, requireExpect } from "./matcher.js"
import type { CdkSnapshotOptions } from "./options.js"

export { cdkTemplate } from "./index.js"
export type { CdkSnapshotOptions, CdkTemplateOptions } from "./options.js"

declare global {
  namespace jest {
    // Type parameters must match the upstream declaration exactly.
    // biome-ignore lint/complexity/noBannedTypes: mirrors @types/jest
    interface Matchers<R, T = {}> {
      toMatchCdkSnapshot(options?: CdkSnapshotOptions): R
    }
  }
}

registerCdkMatcher(
  requireExpect("Jest", (globalThis as { expect?: unknown }).expect),
  cdkTemplate,
)
