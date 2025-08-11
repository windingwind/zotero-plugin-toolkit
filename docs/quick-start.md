# Quick Start

Welcome to **Zotero Plugin Toolkit** – a powerful utility library to simplify Zotero plugin development across Zotero 6, 7, and 8.

This quick-start guide will walk you through installing the toolkit, setting it up in your plugin, and using key APIs.

## 🛠️ Installation

Install the toolkit via your package manager:

::: code-group

```bash [npm]
npm install --save zotero-plugin-toolkit
```

```bash [yarn]
yarn add zotero-plugin-toolkit
```

```bash [pnpm]
pnpm add zotero-plugin-toolkit
```

:::

## 📦 Importing the Toolkit

You can either import the full toolkit or individual modules to reduce your plugin size.

### Option 1: Import all modules via the main class

```ts
import { ZoteroToolkit } from "zotero-plugin-toolkit";

const ztoolkit = new ZoteroToolkit();
```

### Option 2: Import only what you need <Badge text="Recommended" type="tip" />

```ts
import { BasicTool, ClipboardHelper, UITool } from "zotero-plugin-toolkit";

const basic = new BasicTool();
const ui = new UITool();
```

## 🚀 Basic Usage Example

```ts
const ztoolkit = new ZoteroToolkit();

// Logging with context-aware output
ztoolkit.log("This is Zotero:", ztoolkit.getGlobal("Zotero"));

// Accessing a global object
const ZoteroPane = ztoolkit.getGlobal("ZoteroPane");
```

> [!TIP]
> `getGlobal` provides proper type hints for `Zotero`, `window`, `document`, and other global objects.

## 🧩 Key Features

- **Basic Tools**: Logging, global variable access, cross-version DOM utilities.
- **UI & Dialog Helpers**: Build interactive elements like dialogs, tables, and guides.
- **Managers**: Register menus, keyboard shortcuts, field hooks, and prompt panels.
- **Helpers**: Access file pickers, clipboard, progress windows, preferences, and more.
- **Utilities**: Patch core Zotero functions, use debug/plugin bridges, and conditionally wait for actions.

See the [API Documentation](./reference/index.md) for detailed usage of each module.

## 🧪 Example Plugin

Want to see it in action? Explore the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template/) – a starter project that already integrates this toolkit.

It also includes:

- Live plugin reloading
- Examples for Zotero 6, 7, and 8
- Usage of various toolkit APIs

## ⚠️ Plugin Lifecycle Reminder

All manager classes (`MenuManager`, `KeyboardManager`, etc.) include `register()` and `unregister()` methods.

> [!WARNING]
> **Always unregister** in your plugin's shutdown phase to prevent memory leaks or stale hooks.

## 🧩 Type Safety

This toolkit works best with [zotero-types](https://github.com/windingwind/zotero-types), which provides full TypeScript support for Zotero APIs.

Install it as a dev dependency:

```bash
npm install --save-dev zotero-types
```
