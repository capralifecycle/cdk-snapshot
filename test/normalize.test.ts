import { describe, expect, test } from "bun:test"
import { normalize, type Template } from "../src/normalize.js"
import type { CdkTemplateOptions } from "../src/options.js"

const withResources = (resources: Template): Template => ({
  Resources: resources,
})

describe("bootstrap version", () => {
  test("is removed by default", () => {
    const template = normalize({
      Parameters: { BootstrapVersion: { Type: "String" } },
      Rules: { CheckBootstrapVersion: { Assertions: [] } },
      Resources: {},
    })

    expect(template.Parameters).toBeUndefined()
    expect(template.Rules).toBeUndefined()
  })

  test("leaves sibling parameters and rules in place", () => {
    const template = normalize({
      Parameters: { BootstrapVersion: {}, Other: { Type: "String" } },
      Rules: { CheckBootstrapVersion: {}, OtherRule: {} },
      Resources: {},
    })

    expect(template.Parameters).toEqual({ Other: { Type: "String" } })
    expect(template.Rules).toEqual({ OtherRule: {} })
  })

  test("is kept when the option is disabled", () => {
    const template = normalize(
      { Parameters: { BootstrapVersion: { Type: "String" } } },
      { ignoreBootstrapVersion: false },
    )

    expect(template.Parameters.BootstrapVersion).toBeDefined()
  })
})

describe("ignoreAssets", () => {
  test("replaces Lambda code and container images", () => {
    const placeholder = "<ASSET>"
    const template = normalize(
      withResources({
        Fn: { Properties: { Code: { S3Key: "abc.zip" }, Handler: "index" } },
        Task: {
          Properties: {
            ContainerDefinitions: [{ Image: "1234.dkr.ecr/x:tag", Cpu: 256 }],
          },
        },
      }),
      { ignoreAssets: true, assetPlaceholder: placeholder },
    )

    expect(template.Resources.Fn.Properties.Code).toBe(placeholder)
    expect(template.Resources.Fn.Properties.Handler).toBe("index")
    expect(template.Resources.Task.Properties.ContainerDefinitions[0]).toEqual({
      Image: placeholder,
      Cpu: 256,
    })
  })

  test("replaces the whole Parameters block when one survives", () => {
    const template = normalize(
      {
        Parameters: { AssetS3Bucket: { Type: "String" } },
        Resources: {},
      },
      { ignoreAssets: true, assetPlaceholder: "<ASSET>" },
    )

    expect(template.Parameters).toBe("<ASSET>")
  })

  test("leaves Parameters absent when only the bootstrap one existed", () => {
    const template = normalize(
      {
        Parameters: { BootstrapVersion: { Type: "String" } },
        Resources: {},
      },
      { ignoreAssets: true, assetPlaceholder: "<ASSET>" },
    )

    expect(template.Parameters).toBeUndefined()
  })
})

describe("ignoreAssetHashes", () => {
  const asset = "a".repeat(64)
  const other = "b".repeat(64)
  const mask = "<ASSET_HASH>"

  const masked = (resources: Template, hashes = new Set([asset])) =>
    normalize(withResources(resources), { ignoreAssetHashes: true }, hashes)
      .Resources

  const cases: [label: string, resources: Template, expected: Template][] = [
    [
      "inside a string value",
      { Fn: { Code: { S3Key: `${asset}.zip` } } },
      { Fn: { Code: { S3Key: `${mask}.zip` } } },
    ],
    [
      "in an array element",
      { Deploy: { SourceObjectKeys: [`${asset}.zip`] } },
      { Deploy: { SourceObjectKeys: [`${mask}.zip`] } },
    ],
    [
      "in an intrinsic function fragment",
      { Nested: { TemplateURL: { "Fn::Join": ["", ["/", `${asset}.json`]] } } },
      { Nested: { TemplateURL: { "Fn::Join": ["", ["/", `${mask}.json`]] } } },
    ],
    [
      "in an object key",
      { Fn: { Metadata: { [`asset.${asset}`]: true } } },
      { Fn: { Metadata: { [`asset.${mask}`]: true } } },
    ],
    [
      "nothing of a hash that is not an asset's",
      { Fn: { Environment: { PARAMS_HASH: other } } },
      { Fn: { Environment: { PARAMS_HASH: other } } },
    ],
    [
      "nothing of a longer hex run containing an asset hash",
      { Fn: { Digest: `${asset}ff` } },
      { Fn: { Digest: `${asset}ff` } },
    ],
  ]

  test.each(cases)("masks %s", (_label, resources, expected) => {
    expect(masked(resources)).toEqual(expected)
  })

  test("masks every asset hash in one string", () => {
    const value = `publish ${asset} then ${other}`

    expect(
      masked({ Step: { Command: value } }, new Set([asset, other])),
    ).toEqual({ Step: { Command: `publish ${mask} then ${mask}` } })
  })

  test("does nothing unless the option is set", () => {
    const template = normalize(
      withResources({ Fn: { Code: { S3Key: `${asset}.zip` } } }),
      {},
      new Set([asset]),
    )

    expect(template.Resources.Fn.Code.S3Key).toBe(`${asset}.zip`)
  })
})

describe("subsetting", () => {
  const resources = (): Template => ({
    Resources: {
      Bucket: { Type: "AWS::S3::Bucket" },
      Fn: { Type: "AWS::Lambda::Function" },
      Queue: { Type: "AWS::SQS::Queue" },
    },
  })

  const subsets: [
    label: string,
    options: CdkTemplateOptions,
    expected: string[],
  ][] = [
    ["one type", { subsetResourceTypes: ["AWS::S3::Bucket"] }, ["Bucket"]],
    [
      "several types",
      { subsetResourceTypes: ["AWS::S3::Bucket", "AWS::SQS::Queue"] },
      ["Bucket", "Queue"],
    ],
    ["a type nothing matches", { subsetResourceTypes: ["AWS::EC2::VPC"] }, []],
    ["one logical id", { subsetResourceKeys: ["Fn"] }, ["Fn"]],
    [
      "several logical ids",
      { subsetResourceKeys: ["Fn", "Queue"] },
      ["Fn", "Queue"],
    ],
    [
      "types and ids together",
      {
        subsetResourceTypes: ["AWS::S3::Bucket", "AWS::SQS::Queue"],
        subsetResourceKeys: ["Queue"],
      },
      ["Queue"],
    ],
  ]

  test.each(subsets)("keeps %s", (_label, options, expected) => {
    const template = normalize(resources(), options)

    expect(Object.keys(template.Resources)).toEqual(expected)
  })
})

describe("metadata and tags", () => {
  test("ignoreMetadata drops both template and resource metadata", () => {
    const template = normalize(
      {
        Metadata: { "aws:cdk:path": "x" },
        Resources: { Bucket: { Type: "AWS::S3::Bucket", Metadata: { a: 1 } } },
      },
      { ignoreMetadata: true },
    )

    expect(template.Metadata).toBeUndefined()
    expect(template.Resources.Bucket.Metadata).toBeUndefined()
  })

  test("ignoreTags drops tags but keeps other properties", () => {
    const template = normalize(
      withResources({
        Bucket: { Properties: { Tags: [{ Key: "a" }], BucketName: "b" } },
      }),
      { ignoreTags: true },
    )

    expect(template.Resources.Bucket.Properties).toEqual({ BucketName: "b" })
  })
})

/**
 * Templates vary by construct: sections are absent, resources carry no
 * properties. Every transform has to tolerate that rather than throw.
 */
describe("degenerate templates", () => {
  const options: [label: string, options: CdkTemplateOptions][] = [
    ["ignoreAssets", { ignoreAssets: true }],
    ["ignoreAssetHashes", { ignoreAssetHashes: true }],
    ["ignoreBootstrapVersion", { ignoreBootstrapVersion: true }],
    ["ignoreCurrentVersion", { ignoreCurrentVersion: true }],
    ["ignoreMetadata", { ignoreMetadata: true }],
    ["ignoreTags", { ignoreTags: true }],
    ["ignorePipelineAssets", { ignorePipelineAssets: true }],
    ["subsetResourceTypes", { subsetResourceTypes: ["AWS::S3::Bucket"] }],
    ["subsetResourceKeys", { subsetResourceKeys: ["Bucket"] }],
  ]

  const templates: [label: string, template: () => Template][] = [
    ["an empty template", () => ({})],
    ["no resources", () => ({ Parameters: { BootstrapVersion: {} } })],
    ["empty resources", () => ({ Resources: {} })],
    [
      "a resource without properties",
      () => ({ Resources: { R: { Type: "X" } } }),
    ],
    [
      "a resource with empty properties",
      () => ({ Resources: { R: { Type: "X", Properties: {} } } }),
    ],
  ]

  const cases = options.flatMap(([option, config]) =>
    templates.map(([shape, build]) => [option, shape, config, build] as const),
  )

  test.each(cases)("%s tolerates %s", (_option, _shape, config, build) => {
    expect(() => normalize(build(), config)).not.toThrow()
  })
})

test("returns a copy rather than mutating the argument", () => {
  const original: Template = {
    Metadata: { "aws:cdk:path": "Stack" },
    Parameters: { BootstrapVersion: { Type: "String" } },
    Resources: { Bucket: { Type: "AWS::S3::Bucket", Metadata: { a: 1 } } },
  }
  const before = structuredClone(original)

  const result = normalize(original, {
    ignoreMetadata: true,
    subsetResourceTypes: [],
  })

  expect(original).toEqual(before)
  expect(result).not.toBe(original)
  expect(result.Resources).toEqual({})
})
