// Stacks shared by every runner, so a difference between their snapshots
// can only come from the runner. CommonJS, so that CommonJS Jest can load it
// on every supported Node.
const path = require("node:path")
const { App, Aws, CfnOutput, Fn, Stack } = require("aws-cdk-lib")
const {
  Code,
  Function: LambdaFunction,
  Runtime,
} = require("aws-cdk-lib/aws-lambda")
const { Bucket } = require("aws-cdk-lib/aws-s3")
const { StringParameter } = require("aws-cdk-lib/aws-ssm")

const assetPath = path.join(__dirname, "asset")

const env = { account: "112233445566", region: "eu-west-1" }

function fixtureStack() {
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
function emptyStack() {
  return new Stack(new App(), "Empty", { env })
}

const options = { ignoreAssets: true, ignoreCurrentVersion: true }

module.exports = { emptyStack, fixtureStack, options }
