import { readFileSync } from "node:fs"
import { type Stack, Stage } from "aws-cdk-lib"

interface Assembly {
  readonly artifacts: readonly {
    readonly manifest: { readonly type: string }
  }[]
}

interface AssetManifest {
  files?: Record<string, unknown>
  dockerImages?: Record<string, unknown>
}

/**
 * The IDs of every file and container image asset in the cloud assembly
 * `stack` belongs to, nested assemblies such as CDK Pipelines stages included.
 * Under CDK's default synthesizer an asset's ID is the hash it is published
 * under.
 *
 * Synthesis is cached per stage, so this reads the assembly the stack's
 * template came from.
 */
export function assetHashes(stack: Stack): Set<string> {
  const hashes = new Set<string>()
  const stage = Stage.of(stack)
  if (stage) collect(stage.synth(), hashes)
  return hashes
}

// Artifacts are told apart by manifest type rather than instanceof, which
// fails when the app was built with a different copy of aws-cdk-lib.
function collect(assembly: Assembly, hashes: Set<string>): void {
  for (const artifact of assembly.artifacts) {
    switch (artifact.manifest.type) {
      case "cdk:asset-manifest": {
        const { file } = artifact as unknown as { file: string }
        const { files = {}, dockerImages = {} } = JSON.parse(
          readFileSync(file, "utf8"),
        ) as AssetManifest
        for (const id of Object.keys({ ...files, ...dockerImages })) {
          hashes.add(id)
        }
        break
      }
      case "cdk:cloud-assembly": {
        const { nestedAssembly } = artifact as unknown as {
          nestedAssembly: Assembly
        }
        collect(nestedAssembly, hashes)
        break
      }
    }
  }
}
