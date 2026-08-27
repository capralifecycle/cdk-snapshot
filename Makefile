# Local build: formats, regenerates snapshots, and leaves the tree ready to
# commit.
.PHONY: build
build: install fix typecheck snapshots test

# What the CI workflow runs. Regenerates the same snapshots, then fails if that
# produced a change nobody committed.
.PHONY: ci
ci: install check snapshots test snapshots-check

.PHONY: all
all: build

.PHONY: install
install:
	bun install

.PHONY: fix
fix:
	bun run fix

.PHONY: check
check:
	bun run check

.PHONY: typecheck
typecheck:
	bun run typecheck

.PHONY: test
test:
	bun run test

.PHONY: compile
compile:
	bun run build

# Regenerates the unit snapshots, then the same stack under every supported
# runner so that test/compat.test.ts can compare what they produced.
.PHONY: snapshots
snapshots: compile
	bun test compat/bun.test.mjs --update-snapshots
	NODE_OPTIONS=--experimental-vm-modules bunx jest -c compat/jest.config.mjs -u
	bunx vitest run --update --config compat/vitest.config.mjs
	node --test --test-update-snapshots compat/node.test.mjs
	bun run snapshots

.PHONY: snapshots-check
snapshots-check: snapshots
	git add --intent-to-add ':(glob)**/__snapshots__/**'
	git diff --exit-code ':(glob)**/__snapshots__/**'

.PHONY: clean
clean:
	rm -rf lib

.PHONY: clean-all
clean-all: clean
	rm -rf node_modules
