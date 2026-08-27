import { format, plugins } from "pretty-format"

/**
 * Serializes a value the way Jest, Vitest and Bun serialize snapshots.
 *
 * `node:test` formats with `JSON.stringify` by default, which would make its
 * snapshots incompatible with the other runners.
 */
export function serialize(value: unknown): string {
  return format(value, {
    escapeRegex: true,
    escapeString: false,
    indent: 2,
    printBasicPrototype: false,
    printFunctionName: false,
    plugins: [plugins.AsymmetricMatcher],
  })
}
