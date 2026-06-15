# Release Process

mdalchemy publishes through npm first. Homebrew distribution can build on top of
the npm package once the first stable npm release is available.

## Release Gates

Before a release tag is created:

- The package version is updated in `package.json` and `package-lock.json`.
- `CHANGELOG.md` has a dated entry for the release.
- `README.md` describes installed CLI usage.
- `npm run verify` passes.
- `npm run pack:dry-run` shows only expected package files.
- The GitHub CI workflow is green on Linux, macOS, and Windows.

## npm Trusted Publishing Setup

The first automated npm publish requires a trusted publisher entry on npmjs.com.
Configure the `mdalchemy` package with:

- Publisher: GitHub Actions.
- Organization or user: `okmarshall`.
- Repository: `mdalchemy`.
- Workflow filename: `release.yml`.
- Allowed action: `npm publish`.
- Environment name: leave empty unless the workflow later adds a GitHub
  environment.

The release workflow grants `id-token: write` so GitHub Actions can request an
OIDC token for npm. With trusted publishing from a public GitHub repository, npm
generates provenance attestations automatically; the workflow does not need to
pass `--provenance`.

References:

- npm trusted publishing: https://docs.npmjs.com/trusted-publishers/
- GitHub package publishing: https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages

## Tag Release

1. Update the package version.

   ```sh
   npm version 1.0.0 --no-git-tag-version
   ```

2. Move the relevant `CHANGELOG.md` entries under a dated release heading.

3. Run the release gates locally.

   ```sh
   npm run verify
   npm run pack:dry-run
   ```

4. Commit the release prep.

   ```sh
   git add package.json package-lock.json CHANGELOG.md README.md docs
   git commit -m "Prepare v1.0.0 release"
   ```

5. Create and push the tag.

   ```sh
   git tag v1.0.0
   git push
   git push origin v1.0.0
   ```

The `.github/workflows/release.yml` workflow validates that the tag name matches
the package version. A `v1.0.0` tag only publishes when `package.json` also says
`"version": "1.0.0"`.

## After npm Publish

Verify the package as a user would:

```sh
npm install -g mdalchemy
mdalchemy --version
mdalchemy README.md -o README.html --gfm --toc
mdalchemy book . -o project-docs.html
```

## Homebrew Follow-up

After the npm release is stable, create a Homebrew formula or tap that installs
the npm package and runs a formula test equivalent to:

```sh
mdalchemy --version
mdalchemy test.md -o test.html
```

Keep the formula release separate from the v1 npm release so package publishing
and Homebrew packaging can fail independently.
