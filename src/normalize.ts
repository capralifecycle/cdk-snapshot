import type { CdkTemplateOptions } from "./options.js"
import { anyObject } from "./placeholder.js"

/** A synthesized CloudFormation template. */
// biome-ignore lint/suspicious/noExplicitAny: a CloudFormation template is arbitrary JSON; `unknown` would force a cast at every traversal step
export type Template = Record<string, any>

const currentVersionRegex = /^(.+CurrentVersion[0-9A-F]{8})[0-9a-f]{32}$/
const pipelineCdkAssetsRegex =
  /cdk-assets\s+--path\s+\\"([^\\/]+)\/.+?assets\.json\\"\s+--verbose\s+publish\s+\\"(.+?)\\"/g
const matchRegionInAssetRegex = /:(.*)$/

const maskedVersionSuffix = "x".repeat(32)

/**
 * Applies the configured normalizations to a synthesized template. Mutates and
 * returns `template`.
 *
 * Step order is significant: earlier steps can remove structures that later
 * ones inspect.
 */
export function normalize(
  template: Template,
  options: CdkTemplateOptions = {},
): Template {
  const {
    ignoreAssets = false,
    ignoreBootstrapVersion = true,
    ignoreCurrentVersion = false,
    ignoreMetadata = false,
    ignoreTags = false,
    ignorePipelineAssets = false,
    subsetResourceTypes,
    subsetResourceKeys,
    assetPlaceholder = anyObject,
  } = options

  if (ignoreBootstrapVersion) stripBootstrapVersion(template)
  if (ignoreAssets) stripAssets(template, assetPlaceholder)
  if (ignoreCurrentVersion && template.Resources) maskCurrentVersions(template)
  if (ignorePipelineAssets && template.Resources) maskPipelineAssets(template)
  if (subsetResourceTypes) {
    keepResources(template, (_key, resource) =>
      subsetResourceTypes.includes(resource?.Type),
    )
  }
  if (subsetResourceKeys) {
    keepResources(template, (key) => subsetResourceKeys.includes(key))
  }
  if (ignoreMetadata) stripMetadata(template)
  if (ignoreTags) stripTags(template)

  return template
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

function maskCurrentVersions(tree: unknown): void {
  transformStrings(tree, (value) => {
    const match = currentVersionRegex.exec(value)
    return match ? `${match[1]}${maskedVersionSuffix}` : value
  })
}

function maskPipelineAssets(tree: unknown): void {
  transformStrings(tree, (value) => {
    let result = value
    for (const match of value.matchAll(pipelineCdkAssetsRegex)) {
      const region = matchRegionInAssetRegex.exec(match[2] ?? "")
      const assetId = region?.[1] ? region[1] : "<ASSET_ID>"
      result = result.replace(
        match[0],
        `cdk-assets --path "<${match[1]}>" --verbose publish "${assetId}"`,
      )
    }
    return result
  })
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
