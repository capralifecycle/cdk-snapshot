import { describe, expect, test } from "bun:test"
import { normalize, type Template } from "../src/normalize.js"

const HASH = "a".repeat(32)
const MASK = "x".repeat(32)

const maskIds = (...ids: string[]): string[] => {
  const Resources = Object.fromEntries(ids.map((id) => [id, { Type: "X" }]))
  return Object.keys(
    normalize({ Resources }, { ignoreCurrentVersion: true }).Resources,
  )
}

/**
 * The suffix is a content hash, so it changes whenever handler code changes.
 * Which identifiers qualify has to match jest-cdk-snapshot exactly, or
 * snapshots carried over from it start drifting.
 */
describe("current version masking", () => {
  const ids: [label: string, id: string, expected: string][] = [
    [
      "a well-formed logical id",
      `FnCurrentVersionABCDEF12${HASH}`,
      `FnCurrentVersionABCDEF12${MASK}`,
    ],
    [
      "a digit-only discriminator",
      `FnCurrentVersion12345678${HASH}`,
      `FnCurrentVersion12345678${MASK}`,
    ],
    [
      "a hash one character short",
      `FnCurrentVersionABCDEF12${"a".repeat(31)}`,
      `FnCurrentVersionABCDEF12${"a".repeat(31)}`,
    ],
    [
      "a hash one character long",
      `FnCurrentVersionABCDEF12${"a".repeat(33)}`,
      `FnCurrentVersionABCDEF12${"a".repeat(33)}`,
    ],
    [
      "a lowercase discriminator",
      `FnCurrentVersionabcdef12${HASH}`,
      `FnCurrentVersionabcdef12${HASH}`,
    ],
    [
      "an id with nothing before the marker",
      `CurrentVersionABCDEF12${HASH}`,
      `CurrentVersionABCDEF12${HASH}`,
    ],
    ["an unrelated logical id", "Bucket43879C71", "Bucket43879C71"],
  ]

  test.each(ids)("masks %s", (_label, id, expected) => {
    expect(maskIds(id)).toEqual([expected])
  })

  const trees: [label: string, tree: Template, expected: unknown][] = [
    [
      "a string value",
      { Resources: { R: { Ref: `FnCurrentVersionABCDEF12${HASH}` } } },
      { R: { Ref: `FnCurrentVersionABCDEF12${MASK}` } },
    ],
    [
      "an array element",
      { Resources: { R: { DependsOn: [`FnCurrentVersionABCDEF12${HASH}`] } } },
      { R: { DependsOn: [`FnCurrentVersionABCDEF12${MASK}`] } },
    ],
    [
      "a deeply nested value",
      {
        Resources: {
          R: { A: [{ B: { C: [`FnCurrentVersionABCDEF12${HASH}`] } }] },
        },
      },
      { R: { A: [{ B: { C: [`FnCurrentVersionABCDEF12${MASK}`] } }] } },
    ],
    [
      "a non-string leaf it must leave alone",
      { Resources: { R: { Count: 3, Enabled: false, Missing: null } } },
      { R: { Count: 3, Enabled: false, Missing: null } },
    ],
  ]

  test.each(trees)("rewrites %s", (_label, tree, expected) => {
    expect(normalize(tree, { ignoreCurrentVersion: true }).Resources).toEqual(
      expected,
    )
  })
})

/**
 * CDK Pipelines embeds asset paths and IDs in shell commands, which change on
 * every synth.
 */
describe("pipeline asset masking", () => {
  const command = (path: string, asset: string) =>
    String.raw`cdk-assets --path \"${path}/x.assets.json\" --verbose publish \"${asset}\"`

  const commands: [label: string, input: string, expected: string][] = [
    [
      "the path and the trailing region",
      command("assembly-Pipeline", "abc123:eu-west-1"),
      'cdk-assets --path "<assembly-Pipeline>" --verbose publish "eu-west-1"',
    ],
    [
      "an asset with no region suffix",
      command("assembly-Pipeline", "abc123"),
      'cdk-assets --path "<assembly-Pipeline>" --verbose publish "<ASSET_ID>"',
    ],
    ["a command it does not recognise", "npm run build", "npm run build"],
  ]

  test.each(commands)("masks %s", (_label, input, expected) => {
    const template = normalize(
      { Resources: { Step: { Commands: [input] } } },
      { ignorePipelineAssets: true },
    )

    expect(template.Resources.Step.Commands[0]).toBe(expected)
  })

  test("masks every command in a single string", () => {
    const input = `${command("assembly-A", "a:eu-west-1")} && ${command("assembly-B", "b:eu-north-1")}`

    const template = normalize(
      { Resources: { Step: { Commands: [input] } } },
      { ignorePipelineAssets: true },
    )

    expect(template.Resources.Step.Commands[0]).toBe(
      'cdk-assets --path "<assembly-A>" --verbose publish "eu-west-1" && ' +
        'cdk-assets --path "<assembly-B>" --verbose publish "eu-north-1"',
    )
  })
})
