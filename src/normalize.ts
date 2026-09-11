import type { CdkTemplateOptions } from "./options.js"
import { anyObject } from "./placeholder.js"

/** A synthesized CloudFormation template. */
// biome-ignore lint/suspicious/noExplicitAny: a CloudFormation template is arbitrary JSON; `unknown` would force a cast at every traversal step
export type Template = Record<string, any>

const currentVersionRegex = /^(.+CurrentVersion[0-9A-F]{8})[0-9a-f]{32}$/
const pipelineCdkAssetsRegex =
  /cdk-assets\s+--path\s+\\"([^\\/]+)\/.+?assets\.json\\"\s+--verbose\s+publish\s+\\"(.+?)\\"/g
const assetDestinationRegex = /:(.*?)(?:-[0-9a-f]{8})?$/
const assetHashRegex = /(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/g

const maskedVersionSuffix = "x".repeat(32)
const maskedAssetHash = "<ASSET_HASH>"

/**
 * Returns a copy of `template` with the configured normalizations applied. The
 * argument is left untouched: `Template.fromStack` hands out the assembly's
 * cached template object, so mutating it would corrupt every later assertion
 * on the same stack.
 *
 * Step order is significant: earlier steps can remove structures that later
 * ones inspect.
 *
 * `assetHashes` are the hashes {@link CdkTemplateOptions.ignoreAssetHashes}
 * masks, as read from the stack's cloud assembly.
 */
export function normalize(
  template: Template,
  options: CdkTemplateOptions = {},
  assetHashes: ReadonlySet<string> = new Set(),
): Template {
  const {
    ignoreAssets = false,
    ignoreAssetHashes = false,
    ignoreBootstrapVersion = true,
    ignoreCurrentVersion = false,
    ignoreMetadata = false,
    ignoreTags = false,
    ignorePipelineAssets = false,
    subsetResourceTypes,
    subsetResourceKeys,
    assetPlaceholder = anyObject,
  } = options

  const result = structuredClone(template)

  if (ignoreBootstrapVersion) stripBootstrapVersion(result)
  if (ignoreAssets) stripAssets(result, assetPlaceholder)
  if (ignoreAssetHashes) maskAssetHashes(result, assetHashes)
  if (ignoreCurrentVersion) maskCurrentVersions(result)
  if (ignorePipelineAssets) maskPipelineAssets(result)
  if (subsetResourceTypes) {
    keepResources(result, (_key, resource) =>
      subsetResourceTypes.includes(resource?.Type),
    )
  }
  if (subsetResourceKeys) {
    keepResources(result, (key) => subsetResourceKeys.includes(key))
  }
  if (ignoreMetadata) stripMetadata(result)
  if (ignoreTags) stripTags(result)

  return result
}

function stripBootstrapVersion(template: Template): void {
  const { Parameters, Rules } = template
  if (Parameters) {
    delete Parameters.BootstrapVersion
    if (Object.keys(Parameters).length === 0) delete template.Parameters
  }
  if (Rules) {
    delete Rules.CheckBootstrapVersion
    if (Object.keys(Rules).length === 0) delete template.Rules
  }
}

function stripAssets(template: Template, placeholder: unknown): void {
  if (!template.Resources) return

  if (template.Parameters) {
    template.Parameters = placeholder
  }

  for (const resource of Object.values(template.Resources)) {
    const properties = (resource as Template)?.Properties
    if (!properties) continue

    if (properties.Code) {
      properties.Code = placeholder
    }
    for (const definition of properties.ContainerDefinitions ?? []) {
      definition.Image = placeholder
    }
  }
}

/**
 * Only a standalone 64-hex run is a candidate, so a longer hex string that
 * happens to contain an asset hash is left intact.
 */
function maskAssetHashes(tree: unknown, hashes: ReadonlySet<string>): void {
  transformStrings(tree, (value) =>
    value.replace(assetHashRegex, (hash) =>
      hashes.has(hash) ? maskedAssetHash : hash,
    ),
  )
}

function maskCurrentVersions(tree: unknown): void {
  transformStrings(tree, (value) => {
    const match = currentVersionRegex.exec(value)
    return match ? `${match[1]}${maskedVersionSuffix}` : value
  })
}

/**
 * `cdk-assets ... publish "<hash>:<account>-<region>-<suffix>"` — the hash and
 * the 8-hex suffix follow the asset's content, the account and region do not.
 * CDK versions before the suffix emit `<hash>:<account>-<region>`.
 */
function maskPipelineAssets(tree: unknown): void {
  transformStrings(tree, (value) =>
    value.replace(
      pipelineCdkAssetsRegex,
      (_match: string, assemblyDir: string, asset: string) => {
        const destination =
          assetDestinationRegex.exec(asset)?.[1] || "<ASSET_ID>"
        return `cdk-assets --path "<${assemblyDir}>" --verbose publish "${destination}"`
      },
    ),
  )
}

/** Rewrites every string in `tree`, object keys included, in place. */
function transformStrings(
  tree: unknown,
  transform: (value: string) => string,
): void {
  if (tree == null || typeof tree !== "object") return

  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      const value = tree[i]
      if (typeof value === "string") {
        tree[i] = transform(value)
      } else {
        transformStrings(value, transform)
      }
    }
    return
  }

  const record = tree as Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    const newKey = transform(key)
    if (newKey !== key) {
      record[newKey] = value
      delete record[key]
    }
    if (typeof value === "string") {
      record[newKey] = transform(value)
    } else {
      transformStrings(value, transform)
    }
  }
}

function keepResources(
  template: Template,
  keep: (key: string, resource: Template) => boolean,
): void {
  if (!template.Resources) return
  for (const [key, resource] of Object.entries(template.Resources)) {
    if (!keep(key, resource as Template)) {
      delete template.Resources[key]
    }
  }
}

function stripMetadata(template: Template): void {
  delete template.Metadata
  for (const resource of Object.values(template.Resources ?? {})) {
    delete (resource as Template)?.Metadata
  }
}

function stripTags(template: Template): void {
  for (const resource of Object.values(template.Resources ?? {})) {
    const properties = (resource as Template)?.Properties
    if (properties?.Tags) delete properties.Tags
  }
}
