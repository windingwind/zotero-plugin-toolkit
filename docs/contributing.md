# Contributing

## Setup

1. Fork this repo.

2. Make sure you have `nodejs` and `npm` installed. Clone the repo folder and install dependencies:

```bash
git clone https://github.com/windingwind/zotero-plugin-toolkit
cd zotero-plugin-toolkit
npm install
```

## Build

Run `npm run build`.

- Package `.js` and `.d.ts` under `./dist`;

- Documentations under `./docs`.

## Test Locally

Test it with your plugin or use [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template/) as a playground.

Run `npm install /path/to/this/repo` under the playground repo folder, the lib will be installed from your local build.

The playground uses the latest build. No need to npm install again if you rebuild this lib.

## Release

`npm run release`. Tagged pushes will trigger a npm-publish GitHub action.
