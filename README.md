# Zotero Plugin Toolkit

## Intro

This repo is published as an NPM package [zotero-plugin-toolkit](https://www.npmjs.com/package/zotero-plugin-toolkit), which provides useful APIs for [Zotero](https://www.zotero.org/) plugin developers.

[API Documentation](docs/index.md)

## Modules

- [ZoteroToolkit](docs/zotero-plugin-toolkit.zoterotoolkit.md): Contains all modules of this library. Start from `import ZoteroToolkit from "zotero-plugin-toolkit"` to get familiar with the APIs.

- [Basic Tool](docs/zotero-plugin-toolkit.basictool.md)

  - [getGlobal](docs/zotero-plugin-toolkit.basictool-getglobal_12.md): Get global variables for bootstrapped plugin sandbox. `Zotero`, `ZoteroPane`, `window`, `document`, and any variables under `window`. With type hint.
  - [log](docs/zotero-plugin-toolkit.basictool.log.md): Output to both `Zotero.debug` and `console.log`. Can be customized depending on dev/prod environment.
  - [isZotero7](docs/zotero-plugin-toolkit.basictool.iszotero7.md)/[`isXULElement`](./docs/zotero-plugin-toolkit.zoterocompat.isxulelement.md)
  - [createXULElement](docs/zotero-plugin-toolkit.basictool.createxulelement.md)/[getDOMParser](docs/zotero-plugin-toolkit.basictool.getdomparser.md): Compatible on Zotero 6 & 7+. See https://www.zotero.org/support/dev/zotero_7_for_developers

- Tools

  - [UI](docs/zotero-plugin-toolkit.uitool.md): Create elements and manage them automatically.

  - [Reader](docs/zotero-plugin-toolkit.readertool.md): Reader instance APIs.

  - [ExtraField](docs/zotero-plugin-toolkit.extrafieldtool.md): Get/set extra fields APIs.

- Managers

  - [Menu](docs/zotero-plugin-toolkit.menumanager.md): Register menu/menu popup.

  - [Keyboard](docs/zotero-plugin-toolkit.keyboardmanager.md): Register keyboard shortcuts.

  - [Shortcut(Deprecated, use `Keyboard`)](docs/zotero-plugin-toolkit.shortcutmanager.md): Register shortcut keys.

  - [FieldHook](docs/zotero-plugin-toolkit.fieldhookmanager.md): Register custom fields.

  - [Prompt](docs/zotero-plugin-toolkit.promptmanager.md): Register prompt panel command.

  <details>
  <summary>Deprecated Managers</summary>

  - [Patch(Replaced by PatchHelper)](docs/zotero-plugin-toolkit.patchmanager.md): Patch Zotero's built-in functions.

  - [ReaderInstance(Replaced by official API)](docs/zotero-plugin-toolkit.readerinstancemanager.md): Register reader instance hooks.

  - [ItemTree(Replaced by official API)](docs/zotero-plugin-toolkit.itemtreemanager.md): Register extra columns/custom cell.

  - [ItemBox(Replaced by official API)](docs/zotero-plugin-toolkit.itemboxmanager.md): Register extra rows in the right-side info panel.

  - [PreferencePane(Replaced by official API)](docs/zotero-plugin-toolkit.preferencepanemanager.md): Register preference pane for Zotero 6 & 7+. See https://www.zotero.org/support/dev/zotero_7_for_developers

  - [LibraryTabPanel(Deprecated)](docs/zotero-plugin-toolkit.librarytabpanelmanager.md): Register extra tab panel in the library right-sidebar.

  - [ReaderTabPanel(Deprecated)](docs/zotero-plugin-toolkit.readertabpanelmanager.md): Register extra tab panel in the reader right-sidebars.

  </details>

- Helpers

  - [Clipboard](docs/zotero-plugin-toolkit.clibpoardhelper.md): Copy text/rich text/image.

  - [FilePicker](docs/zotero-plugin-toolkit.filepickerhelper.md): Open file picker.

  - [ProgressWindow](docs/zotero-plugin-toolkit.progresswindowhelper.md): Open progress window.

  - [VirtualizedTable](docs/zotero-plugin-toolkit.virtualizedtablehelper.md): Create a VirtualizedTable (an advanced table view element, which is used by the Zotero item tree, collections tree, item picker, etc.)

  - [Dialog](docs/zotero-plugin-toolkit.dialoghelper.md): Create a dialog window(a superset of XUL dialog). With data-binding, auto-layout, and control buttons.

  - [Guide](docs/zotero-plugin-toolkit.guidehelper.md): Create a step-by-step guide.

  - [LargePref](docs/zotero-plugin-toolkit.largeprefhelper.md): Store/read large data in `prefs.js`.

  - [Patch](docs/zotero-plugin-toolkit.patchhelper.md): Patch Zotero's built-in functions. A replacement of `PatchManager`.

- Utils

  - [Debug Bridge](src/utils/debugBridge.ts): Use `zotero://ztoolkit-debug/?file=x.js&run=y()&password=zzz&app=m`

    See https://github.com/windingwind/zotero-plugin-template/blob/main/scripts/reload.mjs for example.

    > Parameters (all parameters should be URLEncoded):
    >
    > - file: the path of JS file to run if provided. starts with `file:///`.
    > - run: the JS script to run if provided.
    > - password: the value of `extensions.zotero.debug-bridge.password`. If the password is not empty in Zotero and not provided in the call, the command won't run; otherwise a popup will show to ask user if to execute the command.
    > - app: The app name to show in the popup.

  - [Plugin Bridge](src/utils/pluginBridge.ts): Use `zotero://plugin/?action=install&url=x.xpi`

    > Parameters (all parameters should be URLEncoded):
    >
    > - action: `install`.
    > - url: the url of plugin `xpi` to install.
    > - minVersion: the required minimal version of Zotero if provided.
    > - maxVersion: the required maximal version of Zotero if provided.

  - [Wait](src/utils/wait.ts): Wait for a condition to be true.

## Usage

1. Run `npm install --save zotero-plugin-toolkit`.

2. Import the toolkit class

````ts
import ZoteroToolkit from "zotero-plugin-toolkit";
/* Alternatively, import class you need to minify the plugin size
 * ```ts
 * import { BasicTool } from "zotero-plugin-toolkit/dist/basic";
 * import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
 */
const ztoolkit = new ZoteroToolkit();
````

3. Use the toolkit following this [API Documentation](./docs/index.md)

```ts
ztoolkit.log("This is Zotero:", toolkit.getGlobal("Zotero"));
```

> ⚠️All Manager classes have `register` method with corresponding `unregister/unregisterAll`. Don't forget to unregister when plugin exits.

> This repo depends on [zotero-types](https://github.com/windingwind/zotero-types). See its hompage for more details about Zotero type definitions.

## Examples

This package is integrated into the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template/). You can find examples there.

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

Test it with your plugin or use [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template/) as a playground.

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
