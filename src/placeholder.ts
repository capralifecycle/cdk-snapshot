/**
 * Stand-in for asset-derived values, which change whenever an asset's content
 * does.
 * Serializes as `Any<Object>` so snapshots match across test runners.
 *
 * Bun accepts only matchers built by its own `expect`; the Bun entry point
 * substitutes one.
 */
export const anyObject: unknown = {
  $$typeof: Symbol.for("jest.asymmetricMatcher"),
  asymmetricMatch: (actual: unknown) =>
    typeof actual === "object" && actual !== null,
  toString: () => "Any",
  getExpectedType: () => "Object",
  toAsymmetricMatcher: () => "Any<Object>",
}
