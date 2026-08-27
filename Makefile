# Local build: formats, refreshes snapshots, and leaves the tree ready to commit.
.PHONY: build
build: install fix typecheck snapshots bun-build

# What the CI workflow runs: verifies rather than rewrites.
.PHONY: ci
ci: install check test bun-build

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

.PHONY: snapshots
snapshots:
	bun run snapshots

.PHONY: bun-build
bun-build:
	bun run build

.PHONY: clean
clean:
	rm -rf lib

.PHONY: clean-all
clean-all: clean
	rm -rf node_modules
