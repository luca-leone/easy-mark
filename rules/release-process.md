# Release Process

## Scope

This file records repository release and local packaging steps. It is operational guidance, not product behavior and not an agent bootstrap document.

## Local Package Smoke Test

Create a local tarball only after the deterministic versioning check passes:

```sh
npm run pack:dry-run
```

Install that tarball in a consumer project when testing package installation:

```json
{
  "dependencies": {
    "@easy-mark/cli": "file:/Users/luca/Projects/personal/easy-mark/easy-mark-cli-1.0.0.tgz"
  }
}
```

Then run:

```sh
npx easy-mark serve ./doc
```

If the local npm cache contains root-owned files, use a temporary cache for dry runs:

```sh
npm_config_cache=/tmp/easy-mark-npm-cache npm pack --dry-run
```

## NPM Release

Use the Node baseline, install dependencies, run tests, and perform dry runs before publishing:

```sh
nvm use
npm install
npm test
npm run validate:versioning
npm run pack:dry-run
npm login
npm whoami
npm view @easy-mark/cli name version
npm version patch
npm run pack:dry-run
npm publish --dry-run
npm publish --access public
```

The versioning base is the highest semver value across `package.json`, local tags, and remote tags. Every proposed tag requires this printed push command:

```sh
git push origin <tag>
```

## GitHub Release

Push the release commit, tag it, and create the GitHub release:

```sh
git push origin main
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes "Initial public release of Easy Mark."
```
