export interface CdkTemplateOptions {
  /**
   * Replace every resource's `Code` property, every container definition's
   * `Image`, and the whole `Parameters` block with
   * {@link CdkTemplateOptions.assetPlaceholder}.
   *
   * Assets elsewhere, such as Lambda layers, keep their hash. A function using
   * `currentVersion` also needs
   * {@link CdkTemplateOptions.ignoreCurrentVersion}, since the version's
   * logical ID hashes the code.
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
  /**
   * Drop each resource's `Tags` property. Tags nested deeper, such as a launch
   * template's `TagSpecifications`, are kept.
   */
  ignoreTags?: boolean
  /**
   * Mask asset paths, IDs and destination suffixes inside CDK Pipelines
   * `cdk-assets` commands.
   */
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

/** {@link CdkTemplateOptions} plus what only the snapshot matcher can apply. */
export interface CdkSnapshotOptions extends CdkTemplateOptions {
  /**
   * Property matchers handed to the runner's snapshot assertion, for values
   * the normalizations do not cover.
   */
  propertyMatchers?: Record<string, unknown>
}
