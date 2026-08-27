// One stack shared by every runner, so a difference between their snapshots
// can only come from the runner.
import { App, Stack } from "aws-cdk-lib"
import {
  Code,
  Function as LambdaFunction,
  Runtime,
} from "aws-cdk-lib/aws-lambda"
import { Bucket } from "aws-cdk-lib/aws-s3"

const assetPath = new URL("./asset", import.meta.url).pathname

export function fixtureStack() {
  const app = new App()
  const stack = new Stack(app, "Stack", {
    env: { account: "112233445566", region: "eu-west-1" },
  })
  new Bucket(stack, "Bucket", { bucketName: "parity-bucket" })
  new LambdaFunction(stack, "Fn", {
    runtime: Runtime.NODEJS_22_X,
    handler: "index.handler",
    code: Code.fromAsset(assetPath),
  })
  return stack
}

export const options = { ignoreAssets: true, ignoreCurrentVersion: true }
