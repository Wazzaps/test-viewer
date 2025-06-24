# Test Viewer for GitHub

[Website](https://test-viewer.wazzaps.net) | [Documentation](https://github.com/wazzaps/test-viewer/wiki)

<img src="https://github.com/user-attachments/assets/97034e6c-456d-448c-b0bd-de49cbd75a4c" title="Test results view" width="800">

## What

Display (junit.xml) test results from GitHub Actions with a nice UI.

## Why

GitHub doesn't have a native way to display test results, and the [workarounds](https://github.com/dorny/test-reporter) are not very good.

## How

Using the GitHub API we fetch the artifacts for a given workflow run, look through the zip file for .xml files, and parse them into a simple UI.

## Development

```shell
curl https://mise.run | sh
mise trust && mise install
pnpm install
pnpm run dev
```

## Deployment to Cloudflare Workers

Change:

- `secrets_store_secrets` and `routes` in `wrangler.jsonc`
- `GITHUB_CLIENT_ID` in `src/config.ts`
- `WHITELISTED_REDIRECT_URIS` in `worker/githubAuth.ts`

```shell
pnpm run deploy
```
