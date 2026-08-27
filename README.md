# @liflig/cdk-snapshot

Normalizes synthesized AWS CDK stacks for snapshot testing by stripping values such as asset hashes, bootstrap parameters, Lambda version suffixes and more, in order to produce more stable and usable snapshot files.

The library provides a generic implementation with a thin adapter per test runner: `node:test`, Bun, Vitest and Jest. Everything is built around one pure function, `cdkTemplate`, which turns a stack into a normalized template object; each adapter wraps that function in whatever the runner's own snapshot assertion looks like. All four produce byte-identical snapshot files, so the same `.snap` files stay valid if a project switches runner.

## Install

```sh
bun add -d @liflig/cdk-snapshot
```

## Usage

Import the entry point for your runner. Jest, Vitest and Bun get a `toMatchCdkSnapshot` matcher; `node:test` as has no `expect` as of time of writing, so it calls `cdkTemplate` directly.

### node:test

`configureCdkSnapshots()` points `node:test` at `__snapshots__/*.snap` and the shared serializer. Call it once, before any test runs.

```js
import test from "node:test";
import { cdkTemplate, configureCdkSnapshots } from "@liflig/cdk-snapshot/node";

configureCdkSnapshots();

test("my stack", (t) => {
  t.assert.snapshot(cdkTemplate(stack, { ignoreAssets: true }));
});
```

Write snapshots with `node --test --test-update-snapshots`.

### Bun

```js
import { expect, test } from "bun:test";
import "@liflig/cdk-snapshot/bun";

test("my stack", () => {
  expect(stack).toMatchCdkSnapshot({ ignoreAssets: true });
});
```

### Vitest

```js
import { expect, test } from "vitest";
import "@liflig/cdk-snapshot/vitest";

test("my stack", () => {
  expect(stack).toMatchCdkSnapshot({ ignoreAssets: true });
});
```

### Jest

```js
import "@liflig/cdk-snapshot/jest";

test("my stack", () => {
  expect(stack).toMatchCdkSnapshot({ ignoreAssets: true });
});
```

Every entry point also exports `cdkTemplate(stack, options)`. Reach for it to assert on the template without a snapshot, or to pass property matchers: `expect(cdkTemplate(stack)).toMatchSnapshot({ ... })`.

## Options

| Option                   | Default | Effect                                                                            |
| ------------------------ | ------- | --------------------------------------------------------------------------------- |
| `ignoreAssets`           | `false` | Replaces Lambda `Code`, container `Image` and asset parameters with `Any<Object>` |
| `ignoreBootstrapVersion` | `true`  | Drops the `BootstrapVersion` parameter and its check rule                         |
| `ignoreCurrentVersion`   | `false` | Masks the content hash on Lambda `CurrentVersion` logical IDs                     |
| `ignoreMetadata`         | `false` | Drops template and resource `Metadata`                                            |
| `ignoreTags`             | `false` | Drops `Tags` from resource properties                                             |
| `ignorePipelineAssets`   | `false` | Masks asset paths and IDs in CDK Pipelines `cdk-assets` commands                  |
| `subsetResourceTypes`    | —       | Keeps only resources of these CloudFormation types                                |
| `subsetResourceKeys`     | —       | Keeps only resources with these logical IDs                                       |

## Development

```sh
make build   # format, refresh snapshots, build
make ci      # same as build, but fail on diff in snapshots, lockfiles etc
```

## Migrating from jest-cdk-snapshot

Change the import. Call sites and `.snap` files stay as they are, since the options, their defaults and the serialization all match.

```diff
-import "jest-cdk-snapshot"
+import "@liflig/cdk-snapshot/jest"
```
