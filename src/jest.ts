import { cdkTemplate } from "./index.js"
import { globalExpect, registerCdkMatcher } from "./matcher.js"
import type { CdkTemplateOptions } from "./options.js"

export { cdkTemplate } from "./index.js"
export type { CdkTemplateOptions } from "./options.js"

declare global {
  namespace jest {
    // Type parameters must match the upstream declaration exactly.
    // biome-ignore lint/complexity/noBannedTypes: mirrors @types/jest
    interface Matchers<R, T = {}> {
      toMatchCdkSnapshot(options?: CdkTemplateOptions): R
    }
  }
}

registerCdkMatcher(globalExpect("Jest"), cdkTemplate)
