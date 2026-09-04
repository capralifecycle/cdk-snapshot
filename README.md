# @liflig/cdk-snapshot

[![npm](https://img.shields.io/npm/v/@liflig/cdk-snapshot.svg)](https://www.npmjs.com/package/@liflig/cdk-snapshot)
[![ci](https://github.com/capralifecycle/cdk-snapshot/actions/workflows/ci.yml/badge.svg)](https://github.com/capralifecycle/cdk-snapshot/actions/workflows/ci.yml)
[![node](https://img.shields.io/node/v/@liflig/cdk-snapshot.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@liflig/cdk-snapshot.svg)](LICENSE)

Snapshot testing for AWS CDK stacks. A stack is synthesized to CloudFormation and
the values that change on every synth, such as asset hashes, bootstrap parameters
and Lambda version suffixes are stripped, so a snapshot fails only when the
infrastructure actually changed.

- One normalization for `node:test`, Bun, Vitest and Jest.
- All four write the same snapshot bodies, so `.snap` files survive a change of runner.
- A drop-in replacement for `jest-cdk-snapshot`: same options, same defaults, same
  serialization.

## Install

```sh
bun add -d @liflig/cdk-snapshot
npm install --save-dev @liflig/cdk-snapshot
pnpm add -D @liflig/cdk-snapshot
```

The package is ESM. Under Jest that needs configuration, see [Jest](#jest).

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

### Jest

```js
import "@liflig/cdk-snapshot/jest";

test("my stack", () => {
  expect(stack).toMatchCdkSnapshot({ ignoreAssets: true });
});
```

Jest loads this package as ESM, which it does only with its ESM support enabled:

```sh
NODE_OPTIONS=--experimental-vm-modules jest
```

A CommonJS test file additionally needs Node 24.9 or later, where Jest can `require()` an
ESM package. Below that, the test file has to be ESM or go through a transform that
compiles the package to CommonJS.

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

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `ignoreAssets` | `boolean` | `false` | Replaces Lambda `Code`, container `Image` and the whole `Parameters` block with `Any<Object>` |
| `ignoreBootstrapVersion` | `boolean` | `true` | Drops the `BootstrapVersion` parameter and its check rule |
| `ignoreCurrentVersion` | `boolean` | `false` | Masks the content hash on Lambda `CurrentVersion` logical IDs and every reference to them |
| `ignoreMetadata` | `boolean` | `false` | Drops template and resource `Metadata` |
| `ignoreTags` | `boolean` | `false` | Drops `Tags` from resource properties |
| `ignorePipelineAssets` | `boolean` | `false` | Masks asset paths and IDs in CDK Pipelines `cdk-assets` commands |
| `subsetResourceTypes` | `string[]` | keep all | Keeps only resources of these CloudFormation types |
| `subsetResourceKeys` | `string[]` | keep all | Keeps only resources with these logical IDs |
| `assetPlaceholder` | `unknown` | `anyObject` | Token substituted for asset-derived values |
| `propertyMatchers` | `Record<string, unknown>` | none | Matchers forwarded to the runner's snapshot assertion; matcher only, `cdkTemplate` does not take it |

`subsetResourceTypes` and `subsetResourceKeys` intersect: given both, a resource is kept
only if it matches both.

`ignoreAssets` replaces the entire `Parameters` block rather than the individual asset
parameters, matching what jest-cdk-snapshot does. It does nothing to a template with no
`Resources`.

`anyObject` is exported from the package root. It is an asymmetric matcher that serializes
as `Any<Object>` and matches any non-null object. The Bun entry point substitutes
`expect.any(Object)` instead, because Bun's serializer only recognizes matchers built by
its own `expect`.

## How it works

Everything is built around one pure function, `cdkTemplate`, which turns a stack into a
normalized template object. Each runner gets a thin adapter that wraps that function in
whatever the runner's own snapshot assertion looks like, so snapshots keep the naming and
format that runner already produces. All four write the same snapshot bodies — only the
file header differs.

## Development

```sh
make build   # install, format, typecheck, refresh snapshots, test
make ci      # what the CI workflow runs: refuses a stale lockfile, fails on an uncommitted snapshot change
```

`make snapshots` regenerates the unit snapshots plus the shared fixture under all four
runners, which `test/compat.test.ts` then compares against each other.

## Migrating from jest-cdk-snapshot

Change the import. Call sites and `.snap` files stay as they are, since the options, their
defaults and the serialization all match.

```diff
-import "jest-cdk-snapshot"
+import "@liflig/cdk-snapshot/jest"
```

Verified against two public CDK libraries, liflig-cdk and cdk-cloudfront-auth: every
existing snapshot passes under `jest --ci`, and a forced `--updateSnapshot` rewrites
nothing.

Jest now has to run with ESM support enabled, since this package is ESM — see
[Jest](#jest).

One option is gone. `yaml` is not supported, so a project snapshotting YAML has to
regenerate as JSON.

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
