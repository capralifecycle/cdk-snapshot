export interface CdkTemplateOptions {
  /**
   * Replace asset-derived values — Lambda `Code`, container `Image`, and the
   * template parameters carrying asset hashes — with {@link anyObject}.
   */
  ignoreAssets?: boolean
  /**
   * Drop the CDK-managed `BootstrapVersion` parameter and its check rule.
   * Defaults to `true`.
   */
  ignoreBootstrapVersion?: boolean
  /** Mask the content hash suffix on Lambda `CurrentVersion` logical IDs. */
  ignoreCurrentVersion?: boolean
  /** Drop template and resource `Metadata`. */
  ignoreMetadata?: boolean
  /** Drop `Tags` from resource properties. */
  ignoreTags?: boolean
  /** Mask asset paths and IDs inside CDK Pipelines `cdk-assets` commands. */
  ignorePipelineAssets?: boolean
  /** Keep only resources of these CloudFormation types. */
  subsetResourceTypes?: string[]
  /** Keep only resources with these logical IDs. */
  subsetResourceKeys?: string[]
  /**
   * Token substituted for asset-derived values. Defaults to a matcher
   * serializing as `Any<Object>`; the Bun entry point overrides it.
   */
  assetPlaceholder?: unknown
}
