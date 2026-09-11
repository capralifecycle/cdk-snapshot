// Stacks shared by every runner, so a difference between their snapshots
// can only come from the runner.
import { App, Aws, CfnOutput, Fn, Stack } from "aws-cdk-lib"
import {
  Code,
  Function as LambdaFunction,
  Runtime,
} from "aws-cdk-lib/aws-lambda"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { StringParameter } from "aws-cdk-lib/aws-ssm"

const assetPath = new URL("./asset", import.meta.url).pathname

const env = { account: "112233445566", region: "eu-west-1" }

export function fixtureStack() {
  const app = new App()
  const stack = new Stack(app, "Stack", { env })
  new Bucket(stack, "Bucket", { bucketName: "parity-bucket" })
  const fn = new LambdaFunction(stack, "Fn", {
    runtime: Runtime.NODEJS_22_X,
    handler: "index.handler",
    code: Code.fromAsset(assetPath),
  })
  // Emits a version whose logical ID carries a content hash, so the fixture
  // exercises both maskings and survives a CDK upgrade.
  fn.currentVersion
  // Multi-line strings as an object value and as an array element, the two
  // places user data and inline code end up in real templates.
  new StringParameter(stack, "Script", {
    stringValue: "#!/bin/bash\necho hello\n",
  })
  new CfnOutput(stack, "Joined", {
    value: Fn.join("", ["line one\nline two\n", Aws.URL_SUFFIX]),
  })
  return stack
}

/** Normalizes to `{}`, a snapshot short enough to fit on one line. */
export function emptyStack() {
  return new Stack(new App(), "Empty", { env })
}

export const options = { ignoreAssets: true, ignoreCurrentVersion: true }
