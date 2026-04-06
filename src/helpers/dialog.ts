import type { ElementProps, TagElementProps } from "../tools/ui.js";
import { hasPrivilegedAPIs, requirePermission } from "../env.js";
import { UITool } from "../tools/ui.js";

/**
 * Dialog window helper. A superset of XUL dialog.
 *
 * In privileged mode, uses `window.openDialog()`.
 * In unprivileged mode, uses the `openWindow()` sandbox global.
 */
export class DialogHelper extends UITool {
  /**
   * Passed to dialog window for data-binding and lifecycle controls. See {@link DialogHelper.setDialogData}
   */
  dialogData: DialogData;
  /**
   * Dialog window instance
   */
  window!: Window;
  protected elementProps: ElementProps & { tag: string };
  /**
   * Create a dialog helper with row \* column grids.
   * @param row
   * @param column
   */
  constructor(row: number, column: number) {
    super();
    if (row <= 0 || column <= 0) {
      throw new Error(`row and column must be positive integers.`);
    }
    this.elementProps = {
      tag: "div",
      namespace: "html",
      styles: {
        display: "flex",
        flexDirection: "column",
        flex: "1",
        minHeight: "0",
      },
      children: [],
    };
    for (let i = 0; i < Math.max(row, 1); i++) {
      this.elementProps.children!.push({
        tag: "div",
        namespace: "html",
        styles: {
          display: "flex",
          flexDirection: "row",
          flex: "0 0 auto",
          width: "100%",
        },
        children: [],
      });
      for (let j = 0; j < Math.max(column, 1); j++) {
        this.elementProps.children![i].children!.push({
          tag: "div",
          namespace: "html",
          styles: {
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            width: "100%",
            minWidth: "0",
          },
          children: [],
        });
      }
    }
    this.elementProps.children!.push({
      tag: "div",
      namespace: "html",
      styles: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: "8px",
        flexShrink: "0",
        padding: "10px",
      },
      children: [],
    });
    this.dialogData = {};
  }

  /**
   * Add a cell at (row, column). Index starts from 0.
   * @param row
   * @param column
   * @param elementProps Cell element props. See {@link ElementProps}
   * @param cellFlex If the cell is flex. Default true.
   */
  addCell(
    row: number,
    column: number,
    elementProps: TagElementProps,
    cellFlex: boolean = true,
  ) {
    if (
      row >= this.elementProps.children!.length ||
      column >= this.elementProps.children![row].children!.length
    ) {
      throw new Error(
        `Cell index (${row}, ${column}) is invalid, maximum (${
          this.elementProps.children!.length
        }, ${this.elementProps.children![0].children!.length})`,
      );
    }
    this.elementProps.children![row].children![column].children = [
      elementProps,
    ];
    if (cellFlex) {
      // Cell and its row grow to fill available vertical space
      this.elementProps.children![row].children![column].styles!.flex = "1 1 0";
      this.elementProps.children![row].children![column].styles!.minHeight =
        "0";
      this.elementProps.children![row].styles!.flex = "1 1 0";
      this.elementProps.children![row].styles!.minHeight = "0";
      // Also stretch the child element to fill the cell
      elementProps.styles = elementProps.styles || {};
      elementProps.styles.flex = elementProps.styles.flex || "1";
      elementProps.styles.minHeight = elementProps.styles.minHeight || "0";
    } else {
      // Cell and row stay at natural height
      this.elementProps.children![row].children![column].styles!.flex =
        "0 0 auto";
    }
    return this;
  }

  /**
   * Add a control button to the bottom of the dialog.
   * @param label Button label
   * @param id Button id.
   * The corresponding id of the last button user clicks before window exit will be set to `dialogData._lastButtonId`.
   * @param options Options
   * @param [options.noClose] Don't close window when clicking this button.
   * @param [options.callback] Callback of button click event.
   */
  addButton(
    label: string,
    id?: string,
    options: {
      noClose?: boolean;
      callback?: (ev: Event) => any;
    } = {},
  ) {
    id = id || `btn-${Zotero.Utilities.randomString()}-${new Date().getTime()}`;
    this.elementProps.children![
      this.elementProps.children!.length - 1
    ].children!.push({
      tag: "button",
      namespace: "html",
      id,
      attributes: {
        type: "button",
        "data-l10n-id": label,
      },
      properties: {
        innerHTML: label,
      },
      listeners: [
        {
          type: "click",
          listener: (e: Event) => {
            this.dialogData._lastButtonId = id;
            if (options.callback) {
              options.callback(e);
            }
            if (!options.noClose) {
              this.window.close();
            }
          },
        },
      ],
    });
    return this;
  }

  /**
   * Dialog data.
   * @remarks
   * This object is passed to the dialog window.
   *
   * The control button id is in `dialogData._lastButtonId`;
   *
   * The data-binding values are in `dialogData`.
   * ```ts
   * interface DialogData {
   *   [key: string | number | symbol]: any;
   *   loadLock?: { promise: Promise<void>; resolve: () => void; isResolved: () => boolean }; // resolve after window load (auto-generated)
   *   loadCallback?: Function; // called after window load
   *   unloadLock?: { promise: Promise<void>; resolve: () => void }; // resolve after window unload (auto-generated)
   *   unloadCallback?: Function; // called after window unload
   *   beforeUnloadCallback?: Function; // called before window unload when elements are accessable.
   * }
   * ```
   * @param dialogData
   */
  setDialogData(dialogData: DialogData) {
    this.dialogData = dialogData;
    return this;
  }

  /**
   * Open the dialog
   * @param title Window title
   * @param windowFeatures
   * @param windowFeatures.width Ignored if fitContent is `true`.
   * @param windowFeatures.height Ignored if fitContent is `true`.
   * @param windowFeatures.left
   * @param windowFeatures.top
   * @param windowFeatures.centerscreen Open window at the center of screen.
   * @param windowFeatures.resizable If window is resizable.
   * @param windowFeatures.fitContent Resize the window to content size after elements are loaded.
   * @param windowFeatures.noDialogMode Dialog mode window only has a close button. Set `true` to make maximize and minimize button visible.
   * @param windowFeatures.alwaysRaised Is the window always at the top.
   */
  open(
    title: string,
    windowFeatures:
      | string
      | {
          width?: number;
          height?: number;
          left?: number;
          top?: number;
          centerscreen?: boolean;
          resizable?: boolean;
          fitContent?: boolean;
          noDialogMode?: boolean;
          alwaysRaised?: boolean;
        } = {
      centerscreen: true,
      resizable: true,
      fitContent: true,
    },
  ) {
    if (typeof windowFeatures === "string") {
      windowFeatures = parseFeatureString(windowFeatures);
    }
    if (!hasPrivilegedAPIs()) {
      requirePermission("openWindow", "DialogHelper.open");
    }
    if (hasPrivilegedAPIs()) {
      this.window = openDialogPrivileged(
        this,
        `dialog-${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
        title,
        this.elementProps,
        this.dialogData,
        windowFeatures,
      );
    } else {
      openDialogUnprivileged(
        this,
        title,
        this.elementProps,
        this.dialogData,
        windowFeatures,
      );
    }
    return this;
  }
}

/**
 * Privileged path: uses window.openDialog().
 */
function openDialogPrivileged(
  dialogHelper: DialogHelper,
  targetId: string,
  title: string,
  elementProps: ElementProps & { tag: string },
  dialogData: DialogData,
  windowFeatures: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
    centerscreen?: boolean;
    resizable?: boolean;
    fitContent?: boolean;
    noDialogMode?: boolean;
    alwaysRaised?: boolean;
  } = {
    centerscreen: true,
    resizable: true,
    fitContent: true,
  },
) {
  dialogData = dialogData || {};

  // Make windowfeature string
  if (!dialogData.loadLock) {
    let loadResolve: () => void;
    let isLoadResolved = false;
    const loadPromise = new Promise<void>((resolve) => {
      loadResolve = resolve;
    });
    loadPromise.then(() => {
      isLoadResolved = true;
    });
    dialogData.loadLock = {
      promise: loadPromise,
      resolve: loadResolve!,
      isResolved: () => isLoadResolved,
    };
  }
  if (!dialogData.unloadLock) {
    let unloadResolve: () => void;
    const unloadPromise = new Promise<void>((resolve) => {
      unloadResolve = resolve;
    });
    dialogData.unloadLock = {
      promise: unloadPromise,
      resolve: unloadResolve!,
    };
  }
  let featureString = `resizable=${windowFeatures.resizable ? "yes" : "no"},`;
  if (windowFeatures.width || windowFeatures.height) {
    featureString += `width=${windowFeatures.width || 100},height=${
      windowFeatures.height || 100
    },`;
  }
  if (windowFeatures.left) {
    featureString += `left=${windowFeatures.left},`;
  }
  if (windowFeatures.top) {
    featureString += `top=${windowFeatures.top},`;
  }
  if (windowFeatures.centerscreen) {
    featureString += "centerscreen,";
  }
  if (windowFeatures.noDialogMode) {
    featureString += "dialog=no,";
  }
  if (windowFeatures.alwaysRaised) {
    featureString += "alwaysRaised=yes,";
  }

  // Create window
  const win = dialogHelper.getGlobal("openDialog")(
    "about:blank",
    targetId || "_blank",
    featureString,
    dialogData,
  ) as Window;

  // After load
  dialogData.loadLock?.promise
    .then(() => {
      // Set title
      win.document.head!.appendChild(
        dialogHelper.createElement(win.document, "title", {
          properties: { innerText: title },
          attributes: { "data-l10n-id": title },
        }),
      );
      let l10nFiles = dialogData.l10nFiles || [];
      if (typeof l10nFiles === "string") {
        l10nFiles = [l10nFiles];
      }
      l10nFiles.forEach((file) => {
        win.document.head!.appendChild(
          dialogHelper.createElement(win.document, "link", {
            properties: {
              rel: "localization",
              href: file,
            },
          }),
        );
      });
      // Add style according to Zotero prefs
      // For custom select(menulist) and a link
      // Create element
      win.document.body!.appendChild(
        dialogHelper.createElement(win.document, "fragment", {
          children: [elementProps],
        }),
      );
      // Load data-binding
      (
        Array.from(win.document.querySelectorAll("*[data-bind]")) as Element[]
      ).forEach((elem: Element) => {
        const bindKey = elem.getAttribute("data-bind");
        const bindAttr = elem.getAttribute("data-attr");
        const bindProp = elem.getAttribute("data-prop");
        if (bindKey && dialogData && dialogData[bindKey]) {
          if (bindProp) {
            (elem as any)[bindProp] = dialogData[bindKey];
          } else {
            elem.setAttribute(bindAttr || "value", dialogData[bindKey]);
          }
        }
      });
      // Resize window
      if (windowFeatures.fitContent) {
        setTimeout(() => {
          try {
            (win as any).sizeToContent();
          } catch {
            // sizeToContent may not be available
          }
        }, 300);
      }
      win.focus();
    })
    .then(() => {
      // Custom load callback
      dialogData?.loadCallback && dialogData.loadCallback();
    });
  dialogData.unloadLock?.promise.then(() => {
    // Custom unload callback
    dialogData?.unloadCallback && dialogData.unloadCallback();
  });

  // Wait for window loading to resolve the lock promise
  win.addEventListener(
    "DOMContentLoaded",
    function onWindowLoad(_ev: Event) {
      (win as any).arguments[0]?.loadLock?.resolve();
      win.removeEventListener("DOMContentLoaded", onWindowLoad, false);
    },
    false,
  );

  // Wait for window unload. Use beforeunload to access elements.
  win.addEventListener("beforeunload", function onWindowBeforeUnload(_ev) {
    // Update data-binding
    (
      Array.from(win.document.querySelectorAll("*[data-bind]")) as Element[]
    ).forEach((elem: Element) => {
      const dialogData = (this.window as any).arguments[0];
      const bindKey = elem.getAttribute("data-bind");
      const bindAttr = elem.getAttribute("data-attr");
      const bindProp = elem.getAttribute("data-prop");
      if (bindKey && dialogData) {
        if (bindProp) {
          dialogData[bindKey] = (elem as any)[bindProp];
        } else {
          dialogData[bindKey] = elem.getAttribute(bindAttr || "value");
        }
      }
    });
    this.window.removeEventListener(
      "beforeunload",
      onWindowBeforeUnload,
      false,
    );
    dialogData?.beforeUnloadCallback && dialogData.beforeUnloadCallback();
  });

  // Wait for window unload to resolve the lock promise
  win.addEventListener("unload", function onWindowUnload(_ev) {
    if (!(this.window as any).arguments[0]?.loadLock?.isResolved()) {
      return;
    }
    (this.window as any).arguments[0]?.unloadLock?.resolve();
    this.window.removeEventListener("unload", onWindowUnload, false);
  });
  if (win.document.readyState === "complete") {
    (win as any).arguments[0]?.loadLock?.resolve();
  }
  return win;
}

/**
 * Unprivileged path: uses the `openWindow()` sandbox global.
 */
function openDialogUnprivileged(
  dialogHelper: DialogHelper,
  title: string,
  elementProps: ElementProps & { tag: string },
  dialogData: DialogData,
  windowFeatures: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
    centerscreen?: boolean;
    resizable?: boolean;
    fitContent?: boolean;
    noDialogMode?: boolean;
    alwaysRaised?: boolean;
  } = {
    centerscreen: true,
    resizable: true,
    fitContent: true,
  },
) {
  dialogData = dialogData || {};

  // Create locks
  if (!dialogData.loadLock) {
    let loadResolve: () => void;
    let isLoadResolved = false;
    const loadPromise = new Promise<void>((resolve) => {
      loadResolve = resolve;
    });
    loadPromise.then(() => {
      isLoadResolved = true;
    });
    dialogData.loadLock = {
      promise: loadPromise,
      resolve: loadResolve!,
      isResolved: () => isLoadResolved,
    };
  }
  if (!dialogData.unloadLock) {
    let unloadResolve: () => void;
    const unloadPromise = new Promise<void>((resolve) => {
      unloadResolve = resolve;
    });
    dialogData.unloadLock = {
      promise: unloadPromise,
      resolve: unloadResolve!,
    };
  }

  // Build feature string for openWindow (only allowed features)
  const featureParts: string[] = [];
  if (windowFeatures.width) featureParts.push(`width=${windowFeatures.width}`);
  if (windowFeatures.height)
    featureParts.push(`height=${windowFeatures.height}`);
  if (windowFeatures.left) featureParts.push(`left=${windowFeatures.left}`);
  if (windowFeatures.top) featureParts.push(`top=${windowFeatures.top}`);
  if (windowFeatures.resizable) featureParts.push("resizable=yes");
  if (windowFeatures.centerscreen) featureParts.push("centerscreen=yes");
  const featureString = featureParts.join(",");

  // Use openWindow sandbox global
  // eslint-disable-next-line ts/no-unsafe-function-type
  const _openWindow = (globalThis as any).openWindow as Function;
  if (typeof _openWindow !== "function") {
    throw new TypeError(
      "[zotero-plugin-toolkit] DialogHelper requires `openWindow` global (unprivileged sandbox) or privileged APIs.",
    );
  }

  // URL must be within the plugin root; "about:blank" is rejected by the sandbox.
  // Must be provided via `dialogData.dialogHtmlUrl`.
  // Generate the template with `npx zotero-plugin-toolkit init-dialog`.
  const dialogUrl = dialogData.dialogHtmlUrl;
  if (!dialogUrl) {
    throw new Error(
      `[zotero-plugin-toolkit] DialogHelper requires "dialogData.dialogHtmlUrl" in unprivileged mode. ` +
        `Set it to a URL within your plugin root (e.g. "chrome/content/dialog.html"). ` +
        `Run \`npx zotero-plugin-toolkit init-dialog\` to generate the template.`,
    );
  }

  _openWindow(dialogUrl, featureString, {
    fitContent: !!windowFeatures.fitContent,
    onLoad: (win: Window) => {
      dialogHelper.window = win;

      // Set title
      win.document.title = title;

      // Add l10n files
      let l10nFiles = dialogData.l10nFiles || [];
      if (typeof l10nFiles === "string") {
        l10nFiles = [l10nFiles];
      }
      l10nFiles.forEach((file) => {
        const link = win.document.createElement("link");
        link.rel = "localization";
        link.href = file;
        win.document.head!.appendChild(link);
      });

      // Append to #dialog-content if present (from dialog.html template),
      // otherwise fall back to document.body
      const container =
        win.document.getElementById("dialog-content") || win.document.body!;
      container.appendChild(
        dialogHelper.createElement(win.document, "fragment", {
          children: [elementProps],
        }),
      );

      // Load data-binding
      (
        Array.from(win.document.querySelectorAll("*[data-bind]")) as Element[]
      ).forEach((elem: Element) => {
        const bindKey = elem.getAttribute("data-bind");
        const bindAttr = elem.getAttribute("data-attr");
        const bindProp = elem.getAttribute("data-prop");
        if (bindKey && dialogData && dialogData[bindKey]) {
          if (bindProp) {
            (elem as any)[bindProp] = dialogData[bindKey];
          } else {
            elem.setAttribute(bindAttr || "value", dialogData[bindKey]);
          }
        }
      });

      win.focus();

      // Resolve load lock
      dialogData.loadLock?.resolve();
      dialogData?.loadCallback && dialogData.loadCallback();

      // Handle beforeunload for data sync
      win.addEventListener("beforeunload", () => {
        // Update data-binding
        (
          Array.from(win.document.querySelectorAll("*[data-bind]")) as Element[]
        ).forEach((elem: Element) => {
          const bindKey = elem.getAttribute("data-bind");
          const bindAttr = elem.getAttribute("data-attr");
          const bindProp = elem.getAttribute("data-prop");
          if (bindKey && dialogData) {
            if (bindProp) {
              dialogData[bindKey] = (elem as any)[bindProp];
            } else {
              dialogData[bindKey] = elem.getAttribute(bindAttr || "value");
            }
          }
        });
        dialogData?.beforeUnloadCallback && dialogData.beforeUnloadCallback();
      });

      // Handle unload
      win.addEventListener("unload", () => {
        dialogData.unloadLock?.resolve();
        dialogData?.unloadCallback && dialogData.unloadCallback();
      });
    },
  });
}

/**
 * Parse a CSS-style window features string into a structured object.
 * e.g. "width=600,height=400,resizable=yes,centerscreen=yes"
 */
function parseFeatureString(features: string): {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  centerscreen?: boolean;
  resizable?: boolean;
  fitContent?: boolean;
  noDialogMode?: boolean;
  alwaysRaised?: boolean;
} {
  const result: Record<string, any> = {};
  for (const part of features.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [key, value] = trimmed.split("=");
    if (!key) continue;
    const k = key.trim();
    const v = (value ?? "").trim();
    // Boolean flags: "centerscreen", "centerscreen=yes", etc.
    const boolKeys = [
      "centerscreen",
      "resizable",
      "fitContent",
      "noDialogMode",
      "alwaysRaised",
    ];
    if (boolKeys.includes(k)) {
      result[k] = v === "" || v === "yes" || v === "true" || v === "1";
    } else {
      // Numeric keys: width, height, left, top
      const num = Number(v);
      if (!Number.isNaN(num)) {
        result[k] = num;
      }
    }
  }
  return result;
}

export interface DialogData {
  [key: string | number | symbol]: any;
  loadLock?: {
    promise: Promise<void>;
    resolve: () => void;
    isResolved: () => boolean;
  };
  loadCallback?: () => void;
  unloadLock?: {
    promise: Promise<void>;
    resolve: () => void;
  };
  unloadCallback?: () => void;
  beforeUnloadCallback?: () => void;
  l10nFiles?: string | string[];
  /**
   * URL of the dialog HTML template for unprivileged mode.
   * Must be within the plugin root (e.g. "chrome/content/dialog.html").
   * Generate with `npx zotero-plugin-toolkit init`.
   * @default "chrome/content/dialog.html"
   */
  dialogHtmlUrl?: string;
}
