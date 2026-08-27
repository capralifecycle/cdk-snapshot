const result = await Bun.build({
  entrypoints: [
    "src/index.ts",
    "src/bun.ts",
    "src/jest.ts",
    "src/node.ts",
    "src/vitest.ts",
  ],
  outdir: "lib",
  target: "node",
  format: "esm",
  // Never bundle the CDK, the serializer, or a test runner into the library.
  external: [
    "aws-cdk-lib",
    "aws-cdk-lib/*",
    "constructs",
    "pretty-format",
    "bun:test",
    "vitest",
    "node:*",
  ],
})

if (!result.success) {
  console.error("Build failed:")
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

console.log(`Built ${result.outputs.length} files`)
