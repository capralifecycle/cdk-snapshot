import { format, plugins } from "pretty-format"

/**
 * Serializes a value the way Jest and Vitest serialize snapshots. Bun matches
 * too, except for multi-line strings nested inside the value.
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
