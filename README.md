# Zotero Plugin Toolkit

## Intro

This repo is published as an NPM package [zotero-plugin-toolkit](https://www.npmjs.com/package/zotero-plugin-toolkit), which provides useful APIs for [Zotero](https://www.zotero.org/) plugin developers.

[API Documentation](./docs/index.md)

## Features

- Consistent API for creating elements & preference pane on Zotero 6/7. See [ZoteroCompat](./docs/zotero-plugin-toolkit.zoterocompat.md)

  - [`getGlobal`](./docs/zotero-plugin-toolkit.zoterocompat.getglobal.md): Global variables in Zotero 6 overlay plugins, `Zotero`, `ZoteroPane`, `window`, `document`, and any variables under `window`.
  - [`isZotero7`](./docs/zotero-plugin-toolkit.zoterocompat.iszotero7.md)/[`isXULElement`](./docs/zotero-plugin-toolkit.zoterocompat.isxulelement.md): Some if statements
  - [`registerPrefPane`](./docs/zotero-plugin-toolkit.zoterocompat.registerprefpane.md)/[`unregisterPrefPane`](./docs/zotero-plugin-toolkit.zoterocompat.unregisterprefpane.md): Preferencepane registrations for Zotero 6 bootstrapped plugins

- Creating HTML/XUL elements in batch form JSON; The toolkit will automatically remove all elements created by your plugin on one call when the plugin is disabled/removed. See [ZoteroUI](./docs/zotero-plugin-toolkit.zoteroui.md)

- Register extra columns to the item tree. See [itemTree](./docs/zotero-plugin-toolkit.itemtreetool.md)

- Tools like copy helper, file picker, progress window, extra field getter/setter, etc. See [ZoteroTools](./docs/zotero-plugin-toolkit.zoterotool.md)

## Usage

1. Run `npm install --save zotero-plugin-toolkit`.

2. Import the toolkit class

```ts
import ZoteroToolkit from "zotero-plugin-toolkit";
// Alternatively, import class you need
// import { ZoteroCompat, ZoteroTool, ZoteroUI } from "zotero-plugin-toolkit"
const toolkit = new ZoteroToolkit();
```

3. Use the toolkit following this [API Documentation](./docs/index.md)

```ts
const Zotero = toolkit.Compat.getZotero();
```

> ⚠️All `registerSth` methods have corresponding `unregisterSth`. Don't forget to unregister when plugin exits. Alternatively, call `unregisterAll` on `ZoteroToolkit` or sub modules.

> This repo depends on [zotero-types](https://github.com/windingwind/zotero-types). See its hompage for more details about Zotero type definitions.

## Examples

This package is integrated into the [Zotero Addon Template](https://github.com/windingwind/zotero-addon-template/). You can find examples there.

If you are new to Zotero plugins/looking for solutions to migrate from Zotero 6 to 7, please take a look at that repo.

The API documentation also contains example code for some APIs.

## Contributing

### Setup

1. Fork this repo.

2. Make sure you have `nodejs` and `npm` installed. Clone the repo folder and install dependencies:

```bash
git clone https://github.com/windingwind/zotero-plugin-toolkit
cd zotero-plugin-toolkit
npm install
```

### Build

Run `npm run build`.

- Package `.js` and `.d.ts` under `./dist`;

- Documentations under `./docs`.

### Test Locally

Test it with your plugin or use [Zotero Addon Template](https://github.com/windingwind/zotero-addon-template/) as a playground.

Run `npm install /path/to/this/repo` under the playground repo folder, the lib will be installed from your local build.

The playground uses the latest build. No need to npm install again if you rebuild this lib.

### Release

`npm run release`. Tagged pushes will trigger a npm-publish GitHub action.

## Disclaimer

Use this code under MIT License. No warranties are provided. Keep the laws of your locality in mind!

If you want to change the license, please contact me at wyzlshx@foxmail.com

## My Zotero Plugins

- [zotero-better-notes](https://github.com/windingwind/zotero-better-notes): Everything about note management. All in Zotero.
- [zotero-pdf-preview](https://github.com/windingwind/zotero-pdf-preview): PDF Preview for Zotero.
- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate): PDF Translation for Zotero 6.
- [zotero-tag](https://github.com/windingwind/zotero-tag): Automatically tag items/Batch tagging
