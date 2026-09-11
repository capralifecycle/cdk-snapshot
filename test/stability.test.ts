import { describe, expect, test } from "bun:test"
import { App, Stack, Stage } from "aws-cdk-lib"
import {
  Code,
  Function as LambdaFunction,
  Runtime,
} from "aws-cdk-lib/aws-lambda"
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines"
import { cdkTemplate } from "../src/bun.js"
import type { CdkTemplateOptions } from "../src/options.js"

/**
 * The promise of the normalizations: an asset whose content changed is not an
 * infrastructure change, so the normalized template must not change with it.
 * Each case synthesizes the same stack from two asset directories that differ
 * only in content.
 */
const assets = {
  original: new URL("./fixtures/asset", import.meta.url).pathname,
  changed: new URL("./fixtures/asset-changed", import.meta.url).pathname,
}

const env = { account: "112233445566", region: "eu-west-1" }

function addFunction(stack: Stack, assetPath: string): void {
  const fn = new LambdaFunction(stack, "Fn", {
    runtime: Runtime.NODEJS_22_X,
    handler: "index.handler",
    code: Code.fromAsset(assetPath),
  })
  fn.currentVersion
}

function functionStack(assetPath: string): Stack {
  const stack = new Stack(new App(), "Stack", { env })
  addFunction(stack, assetPath)
  return stack
}

function pipelineStack(assetPath: string): Stack {
  const stack = new Stack(new App(), "Pipeline", { env })
  const pipeline = new CodePipeline(stack, "Pipeline", {
    synth: new ShellStep("Synth", {
      input: CodePipelineSource.connection("owner/repo", "main", {
        connectionArn: "arn",
      }),
      commands: ["npm run build"],
    }),
  })
  const stage = new Stage(stack, "App", { env })
  addFunction(new Stack(stage, "Service"), assetPath)
  pipeline.addStage(stage)
  return stack
}

function synthesizeBoth(
  build: (assetPath: string) => Stack,
  options: CdkTemplateOptions,
): [original: unknown, changed: unknown] {
  return [
    cdkTemplate(build(assets.original), options),
    cdkTemplate(build(assets.changed), options),
  ]
}

describe("a change to asset content", () => {
  test("shows up when nothing is masked", () => {
    const [original, changed] = synthesizeBoth(functionStack, {})

    expect(changed).not.toEqual(original)
  })

  test("is hidden by ignoreAssets together with ignoreCurrentVersion", () => {
    const [original, changed] = synthesizeBoth(functionStack, {
      ignoreAssets: true,
      ignoreCurrentVersion: true,
    })

    expect(changed).toEqual(original)
  })

  test("still shows through ignoreAssets alone, in the version's logical ID", () => {
    const [original, changed] = synthesizeBoth(functionStack, {
      ignoreAssets: true,
    })

    expect(changed).not.toEqual(original)
  })

  test("in a pipeline stage is hidden by ignorePipelineAssets", () => {
    const [original, changed] = synthesizeBoth(pipelineStack, {
      ignorePipelineAssets: true,
    })

    expect(changed).toEqual(original)
  })
})
