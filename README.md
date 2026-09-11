# @liflig/cdk-snapshot

[![npm](https://img.shields.io/npm/v/@liflig/cdk-snapshot.svg)](https://www.npmjs.com/package/@liflig/cdk-snapshot)
[![ci](https://github.com/capralifecycle/cdk-snapshot/actions/workflows/ci.yml/badge.svg)](https://github.com/capralifecycle/cdk-snapshot/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/@liflig/cdk-snapshot.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@liflig/cdk-snapshot.svg)](LICENSE)

Snapshot testing for AWS CDK stacks. A stack is synthesized to CloudFormation and
normalized before it is snapshotted. The CDK bootstrap version is dropped by default.
Asset hashes, Lambda version suffixes and CDK Pipelines asset IDs change whenever
an asset's content does; the [options](#options) mask them, so a snapshot fails only
when the infrastructure itself changed.

- One normalization for `node:test`, Bun, Vitest and Jest.
- All four record the same template. Switching runner means regenerating the snapshots
  once, see [Switching runner](#switching-runner).
- Replaces `jest-cdk-snapshot` with the same options, defaults and serialization,
  see [Migrating](#migrating-from-jest-cdk-snapshot).

## Install

```sh
bun add -d @liflig/cdk-snapshot
npm install --save-dev @liflig/cdk-snapshot
pnpm add -D @liflig/cdk-snapshot
```

The package is ESM, with a CommonJS build of the root and Jest entry points for
CommonJS Jest projects.

## Usage

Import the entry point for your runner. Jest, Vitest and Bun get a `toMatchCdkSnapshot`
matcher; `node:test` has no `expect`, so it calls `cdkTemplate` directly.

### node:test

`configureCdkSnapshots()` points `node:test` at `__snapshots__/*.snap` and the shared
serializer. Call it once, before any test runs. It replaces the default serializer for
_every_ snapshot in the run, not just CDK ones, so snapshots taken elsewhere in the same
project will be reformatted.

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

`toMatchCdkSnapshot` does not work in concurrent tests: it snapshots through the global
`expect`, which Vitest cannot attribute to a test running concurrently. There, snapshot
the template with the test's own `expect` instead, which records the same entry:

```js
import { cdkTemplate } from "@liflig/cdk-snapshot/vitest";

test.concurrent("my stack", ({ expect }) => {
  expect(cdkTemplate(stack, { ignoreAssets: true })).toMatchSnapshot();
});
```

### Jest

```js
import "@liflig/cdk-snapshot/jest";

test("my stack", () => {
  expect(stack).toMatchCdkSnapshot({ ignoreAssets: true });
});
```

Instead of importing it in each test file, the entry point can be listed once in
`setupFilesAfterEnv`.

A CommonJS test file, including one ts-jest or babel-jest compiles to CommonJS, loads the
CommonJS build and needs no configuration. An ESM test file loads the ESM build, and
needs Jest's ESM support enabled as any ESM test file does:

```sh
NODE_OPTIONS=--experimental-vm-modules jest
```

The Jest entry point uses the global `expect`, so it throws on import if Jest is
configured with `injectGlobals: false`.

### Matcher notes

`toMatchCdkSnapshot` also accepts `propertyMatchers`, forwarded to the runner's own
snapshot assertion for values the normalizations do not cover:

```js
expect(stack).toMatchCdkSnapshot({
  propertyMatchers: { Resources: expect.any(Object) },
});
```

Every entry point also exports `cdkTemplate(stack, options)`. Reach for it to assert on
the template without a snapshot. It leaves the stack untouched, so one stack can be
synthesized repeatedly with different options.

`toMatchCdkSnapshot` cannot be negated; `.not` throws rather than silently passing.

Under Jest and Vitest, `toMatchCdkSnapshot` counts as one assertion towards
`expect.assertions()`. Bun counts it as two, since its `expect` exposes no way to
correct the count.

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `ignoreAssets` | `boolean` | `false` | Replaces every `Code` property, every container definition's `Image` and the whole `Parameters` block with `Any<Object>` |
| `ignoreAssetHashes` | `boolean` | `false` | Replaces the hash of every asset in the app with `<ASSET_HASH>`, wherever it appears |
| `ignoreBootstrapVersion` | `boolean` | `true` | Drops the `BootstrapVersion` parameter and its check rule |
| `ignoreCurrentVersion` | `boolean` | `false` | Masks the content hash on Lambda `CurrentVersion` logical IDs and every reference to them |
| `ignoreMetadata` | `boolean` | `false` | Drops template and resource `Metadata` |
| `ignoreTags` | `boolean` | `false` | Drops `Tags` from resource properties |
| `ignorePipelineAssets` | `boolean` | `false` | Masks asset paths, IDs and destination suffixes in CDK Pipelines `cdk-assets` commands |
| `subsetResourceTypes` | `string[]` | keep all | Keeps only resources of these CloudFormation types |
| `subsetResourceKeys` | `string[]` | keep all | Keeps only resources with these logical IDs |
| `assetPlaceholder` | `unknown` | `anyObject` | Token substituted for asset-derived values |
| `propertyMatchers` | `Record<string, unknown>` | none | Matchers forwarded to the runner's snapshot assertion; matcher only, `cdkTemplate` does not take it |

`subsetResourceTypes` and `subsetResourceKeys` intersect: given both, a resource is kept
only if it matches both.

`ignoreAssets` is coarse, matching what jest-cdk-snapshot does:

- It replaces the entire `Parameters` block. Under CDK's default synthesizer no parameter
  carries an asset hash, so what disappears is the parameters the stack declares itself.
- It replaces values that are not assets as well, so a change to inline Lambda code, to a
  `Code.fromBucket` key or to a registry image tag such as `nginx:1.27` does not show.
- Assets outside Lambda `Code` and container images keep their hash: Lambda layers,
  `BucketDeployment` sources, Step Functions and API Gateway definitions read from files,
  and nested stack templates. `ignoreAssetHashes` covers them.
- A function's `currentVersion` logical ID is a hash over its configuration, code
  included, so a stack that uses it also needs `ignoreCurrentVersion` to stay stable.
- It does nothing to a template with no `Resources`.

`ignoreAssetHashes` is the precise alternative. It reads the hash of every file and
container image asset from the asset manifests the app synthesizes, CDK Pipelines stages
included, and replaces exactly those hashes wherever a string in the template holds one:

```diff
 "Code": {
   "S3Bucket": "cdk-hnb659fds-assets-112233445566-eu-west-1",
-  "S3Key": "9b8fce7ae7f25ef82fdbaf6b72523b99d0875c0c9c826642819fb51f11d9b125.zip",
+  "S3Key": "<ASSET_HASH>.zip",
 },
```

Everything else stays visible: the stack's parameters, inline code, registry image tags
and any hash that belongs to no asset. A function using `currentVersion` still needs
`ignoreCurrentVersion`, and a CDK Pipeline still needs `ignorePipelineAssets` for its
destination suffixes, which are not asset hashes. The hashes come from the asset
manifests that CDK's default synthesizer writes.

`ignoreTags` drops the `Tags` property of each resource. Tags nested deeper stay, such as
those `Tags.of()` propagates into a launch template's `TagSpecifications`.

`ignorePipelineAssets` also drops the 8-character suffix CDK appends to each asset
destination, since that suffix changes with the asset's content too.

`anyObject` is exported from the package root. It is an asymmetric matcher that serializes
as `Any<Object>` and matches any non-null object. The Bun entry point substitutes
`expect.any(Object)` instead, because Bun's serializer only recognizes matchers built by
its own `expect`.

## How it works

Everything is built around one function, `cdkTemplate`, which synthesizes a stack and
hands the template to a pure normalizer. Each runner gets a thin adapter that wraps that function in
whatever the runner's own snapshot assertion looks like, so snapshots keep the naming and
format that runner already produces.

## Switching runner

Regenerate the snapshots with the new runner. The templates they record stay the same; the
diff is limited to how each runner lays out the file around them:

| | Jest | Vitest | node:test | Bun |
| --- | --- | --- | --- | --- |
| Header | Jest's, and files without it are rejected | Vitest's | none | Bun's |
| Name of a test inside `describe` | `suite test 1` | `suite > test 1` | `suite > test 1` | `suite test 1` |
| Entry order | sorted | sorted | sorted | test order |
| Single-line snapshot, such as `{}` | inline | inline | on a line of its own | inline |
| Multi-line string inside a template | starts on its key's line | starts on its key's line | starts on its key's line | string and the comma after it on lines of their own |

Entry order does not affect matching, but it makes a regeneration diff look larger than it
is: two similar snapshots trading places reads as values changing.

`test/compat.test.ts` pins every row, so a runner that changes its format fails the build.

## Development

```sh
make build   # install, format, typecheck, refresh snapshots, test
make ci      # what the CI workflow runs: refuses a stale lockfile, fails on an uncommitted snapshot change
```

`make snapshots` regenerates the unit snapshots plus the shared fixture under all four
runners, Jest once as ESM and once as CommonJS, which `test/compat.test.ts` then compares
against each other.

`make compat-check` runs only the four runners and fails if their snapshots changed. CI
runs it on the oldest Node that `engines` in `package.json` allows.

## Migrating from jest-cdk-snapshot

Change the import, or the `setupFilesAfterEnv` entry. Call sites and `.snap` files stay
as they are, since the options, their defaults and the serialization all match, and the
Jest configuration stays as it is, CommonJS or ESM.

```diff
-import "jest-cdk-snapshot"
+import "@liflig/cdk-snapshot/jest"
```

Verified against two public CDK libraries, liflig-cdk and cdk-cloudfront-auth: every
existing snapshot passes under `jest --ci`, and a forced `--updateSnapshot` rewrites
nothing.

One option is gone. `yaml` is not supported, so a project snapshotting YAML has to
regenerate as JSON.

One option masks more. `ignorePipelineAssets` also drops the content-derived suffix that
recent CDK versions append to asset destinations, which jest-cdk-snapshot keeps. A
pipeline snapshot taken with it changes once, from `publish "111111111111-eu-west-1-2d2574cc"`
to `publish "111111111111-eu-west-1"`, and then stays put when asset content changes.

jest-cdk-snapshot's option type also extended `StageSynthesisOptions`, so it accepted
`skipValidation`, `validateOnSynthesis`, `force`, `errorOnDuplicateSynth` and
`aspectStabilization` while warning at runtime that they did nothing. Here the type
checker rejects them; delete them.

## Releases

Released from `master` by [semantic-release](https://semantic-release.gitbook.io/) on
every merge, so commit messages follow
[Conventional Commits](https://www.conventionalcommits.org/). The changelog is the
[GitHub releases page](https://github.com/capralifecycle/cdk-snapshot/releases).

## License

MIT, see [LICENSE](LICENSE).
