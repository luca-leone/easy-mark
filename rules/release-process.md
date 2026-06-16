# Release Process

## Scope

This file records repository release and local packaging steps. It is operational guidance, not product behavior and not an agent bootstrap document.

## Local Package Smoke Test

Create a local tarball:

```sh
npm pack
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
npm pack --dry-run
npm login
npm whoami
npm view @easy-mark/cli name version
npm version patch
npm publish --dry-run
npm publish --access public
```

## GitHub Release

Push the release commit, tag it, and create the GitHub release:

```sh
git push origin main
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes "Initial public release of Easy Mark."
```
