import { expect, test } from "bun:test"
import { anyObject } from "../src/placeholder.js"
import { serialize } from "../src/serialize.js"

/**
 * The serializer is what lets `node:test` share snapshot files with the other
 * runners. These cases pin the formatting that compatibility depends on.
 */
const values: [label: string, value: unknown, expected: string][] = [
  ["string", "text", '"text"'],
  ["number", 42, "42"],
  ["boolean", true, "true"],
  ["null", null, "null"],
  ["undefined", undefined, "undefined"],
  ["empty object", {}, "{}"],
  ["empty array", [], "[]"],
  ["nested array", [1, ["a"]], '[\n  1,\n  [\n    "a",\n  ],\n]'],
  ["array of objects", [{ a: 1 }], '[\n  {\n    "a": 1,\n  },\n]'],
  ["asymmetric matcher", anyObject, "Any<Object>"],
  ["regex", /ab+c/g, "/ab\\+c/g"],
  ["unescaped quotes", { k: 'say "hi"' }, '{\n  "k": "say "hi"",\n}'],
]

test.each(values)("serializes %s", (_label, value, expected) => {
  expect(serialize(value)).toBe(expected)
})

test("indents nested structures by two spaces", () => {
  expect(serialize({ Resources: { Fn: { Handler: "index.handler" } } })).toBe(
    [
      "{",
      '  "Resources": {',
      '    "Fn": {',
      '      "Handler": "index.handler",',
      "    },",
      "  },",
      "}",
    ].join("\n"),
  )
})

test("orders keys so unrelated reordering cannot churn a snapshot", () => {
  expect(serialize({ b: 1, a: 2 })).toBe(serialize({ a: 2, b: 1 }))
})

/** `anyObject` stands in for asset values in `toEqual` as well as snapshots. */
const matches: [label: string, actual: unknown, expected: boolean][] = [
  ["an object", { S3Key: "abc.zip" }, true],
  ["an array", [], true],
  ["null", null, false],
  ["a string", "abc.zip", false],
  ["undefined", undefined, false],
]

test.each(matches)("anyObject matches %s: %p", (_label, actual, expected) => {
  const matcher = anyObject as { asymmetricMatch: (v: unknown) => boolean }

  expect(matcher.asymmetricMatch(actual)).toBe(expected)
})
