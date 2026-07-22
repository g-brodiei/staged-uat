# Releasing

Versioning matters here: the marketplace reads `.claude-plugin/plugin.json` to decide whether an
installed copy is out of date. A change that isn't version-bumped will not reach anyone who already
installed the plugin.

## Prerequisites

- `git-cliff` installed (`pip install git-cliff`)
- All commits follow [Conventional Commits](https://www.conventionalcommits.org/)

## Steps

### 1. Bump the version

Edit `.claude-plugin/plugin.json` and update `version` (semver):

- **patch** (1.0.x) — wording fixes, doc corrections, no behavioural change to the skill
- **minor** (1.x.0) — new reference material, new phase guidance, new bundled tool
- **major** (x.0.0) — restructuring that changes how the skill is invoked or what it assumes

Commit: `chore: bump version to X.Y.Z`

### 2. Tag

```bash
git tag vX.Y.Z
```

### 3. Regenerate the changelog

```bash
git-cliff -o CHANGELOG.md
```

Commit: `docs: update CHANGELOG for vX.Y.Z`

### 4. Push

```bash
git push origin main --tags
```

### 5. GitHub release

```bash
gh release create vX.Y.Z --title "vX.Y.Z" --notes "$(git-cliff --latest)"
```

Create releases in chronological order — publishing an older release after a newer one can mark the
older one as "Latest".

## Consumers

```bash
/plugin marketplace update staged-uat
```
