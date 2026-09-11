import path from "node:path"
import { snapshot } from "node:test"
import { serialize } from "./serialize.js"

export { cdkTemplate } from "./index.js"
export type { CdkSnapshotOptions, CdkTemplateOptions } from "./options.js"

/**
 * Aligns `node:test` with the snapshot location and serialization the other
 * runners use, so its snapshots record templates the same way theirs do.
 *
 * Call once, before any test runs.
 */
export function configureCdkSnapshots(): void {
  snapshot.setResolveSnapshotPath((testPath) => {
    if (!testPath) {
      throw new Error(
        "@liflig/cdk-snapshot: snapshots require tests to be run from a file.",
      )
    }
    return path.join(
      path.dirname(testPath),
      "__snapshots__",
      `${path.basename(testPath)}.snap`,
    )
  })

  snapshot.setDefaultSnapshotSerializers([serialize])
}
