# Local build: formats, regenerates snapshots, and leaves the tree ready to
# commit.
.PHONY: build
build: install fix typecheck snapshots test

# What the CI workflow runs. Refuses a stale lockfile, regenerates the same
# snapshots, then fails if that produced a change nobody committed. The
# regeneration runs every test, so there is no separate `test` pass here.
.PHONY: ci
ci: install-frozen check snapshots snapshots-check

.PHONY: all
all: build

.PHONY: install
install:
	bun install

.PHONY: install-frozen
install-frozen:
	bun install --frozen-lockfile

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

# Regenerates the shared fixture under every supported runner, so that
# test/compat.test.ts can compare what they produced. Jest and node:test run on
# whichever Node is on PATH.
.PHONY: compat-snapshots
compat-snapshots: compile
	bun test compat/bun.test.mjs --update-snapshots
	NODE_OPTIONS=--experimental-vm-modules bunx jest -c compat/jest.config.mjs -u
	bunx vitest run --update --config compat/vitest.config.mjs
	node --test --test-update-snapshots compat/node.test.mjs

# Regenerates the unit snapshots and the runner snapshots.
.PHONY: snapshots
snapshots: compat-snapshots
	bun run snapshots

define fail-on-snapshot-change
	git add --intent-to-add ':(glob)**/__snapshots__/**'
	git diff --exit-code ':(glob)**/__snapshots__/**'
endef

.PHONY: snapshots-check
snapshots-check: snapshots
	$(fail-on-snapshot-change)

# The runner matrix alone, for checking another Node version against the
# committed snapshots. CI runs it on the oldest Node that package.json allows.
.PHONY: compat-check
compat-check: compat-snapshots
	$(fail-on-snapshot-change)

.PHONY: clean
clean:
	rm -rf lib

.PHONY: clean-all
clean-all: clean
	rm -rf node_modules
