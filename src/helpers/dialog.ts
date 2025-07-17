import type { ElementProps, TagElementProps } from "../tools/ui.js";
import { UITool } from "../tools/ui.js";

/**
 * Dialog window helper. A superset of XUL dialog.
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
  private elementProps: ElementProps & { tag: string };
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
      tag: "vbox",
      attributes: { flex: 1 },
      styles: {
        width: "100%",
        height: "100%",
      },
      children: [],
    };
    for (let i = 0; i < Math.max(row, 1); i++) {
      this.elementProps.children!.push({
        tag: "hbox",
        attributes: { flex: 1 },
        children: [],
      });
      for (let j = 0; j < Math.max(column, 1); j++) {
        this.elementProps.children![i].children!.push({
          tag: "vbox",
          attributes: { flex: 1 },
          children: [],
        });
      }
    }
    this.elementProps.children!.push({
      tag: "hbox",
      attributes: { flex: 0, pack: "end" },
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
    this.elementProps.children![row].children![column].attributes!.flex =
      cellFlex ? 1 : 0;
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
      tag: "vbox",
      styles: {
        margin: "10px",
      },
      children: [
        {
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
   *   loadLock?: _ZoteroTypes.PromiseObject; // resolve after window load (auto-generated)
   *   loadCallback?: Function; // called after window load
   *   unloadLock?: _ZoteroTypes.PromiseObject; // resolve after window unload (auto-generated)
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
    this.window = openDialog(
      this,
      `dialog-${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
      title,
      this.elementProps,
      this.dialogData,
      windowFeatures,
    );
    return this;
  }
}

function createDeferred() {
  let resolve!: () => void, reject!: (reason?: any) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}

function openDialog(
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
  dialogData.loadLock ??= createDeferred();
  dialogData.unloadLock ??= createDeferred();

  // Make windowfeature string
  const featureString = [
    `resizable=${windowFeatures.resizable ? "yes" : "no"}`,
    windowFeatures.width && `width=${windowFeatures.width}`,
    windowFeatures.height && `height=${windowFeatures.height}`,
    windowFeatures.left && `left=${windowFeatures.left}`,
    windowFeatures.top && `top=${windowFeatures.top}`,
    windowFeatures.centerscreen && "centerscreen",
    windowFeatures.noDialogMode && "dialog=no",
    windowFeatures.alwaysRaised && "alwaysRaised=yes",
  ]
    .filter(Boolean)
    .join(",");

  // Create window
  const win = dialogHelper.getGlobal("openDialog")(
    "about:blank",
    targetId || "_blank",
    featureString,
    dialogData,
  ) as Window;

  // After load
  const onLoad = async () => {
    // Set title
    win.document.title = title;

    // Add locale files
    const l10nFiles = [dialogData.l10nFiles || []].flat();
    for (const file of l10nFiles) {
      const link = dialogHelper.createElement(win.document, "link", {
        properties: { rel: "localization", href: file },
      });
      win.document.head.appendChild(link);
    }

    // Add style according to Zotero prefs
    // For custom select(menulist) and a link
    dialogHelper.appendElement(
      {
        tag: "fragment",
        children: [
          {
            tag: "style",
            properties: {
              // eslint-disable-next-line ts/no-use-before-define
              innerHTML: style,
            },
          },
          {
            tag: "link",
            properties: {
              rel: "stylesheet",
              href: "chrome://zotero-platform/content/zotero.css",
            },
          },
        ],
      },
      win.document.head!,
    );

    // Create element
    replaceElement(elementProps, dialogHelper);
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
        win.sizeToContent();
      }, 300);
    }
    win.focus();

    dialogData.loadCallback?.();
    dialogData.loadLock!.resolve();
  };

  const beforeUnolad = () => {
    // Update data-binding
    const attrs = Array.from(
      win.document.querySelectorAll("*[data-bind]"),
    ) as Element[];
    attrs.forEach((elem: Element) => {
      // const dialogData = (window as any).arguments[0];
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

    // Custom beforeUnload hook
    dialogData?.beforeUnloadCallback?.();
  };

  const onUnload = () => {
    dialogData.unloadCallback?.();
    dialogData.unloadLock!.resolve();
  };

  win.addEventListener("DOMContentLoaded", onLoad);
  // Wait for window unload. Use beforeunload to access elements.
  win.addEventListener("beforeunload", beforeUnolad);
  win.addEventListener("unload", onUnload);

  if (win.document.readyState === "complete") {
    dialogData.loadLock?.resolve();
    (dialogData as any)._loaded = true;
  }
  return win;
}

function replaceElement(
  elementProps: ElementProps & { tag: string },
  uiTool: UITool,
) {
  let checkChildren = true;
  if (elementProps.tag === "select") {
    checkChildren = false;
    const customSelectProps = {
      tag: "div",
      classList: ["dropdown"],
      listeners: [
        {
          type: "mouseleave",
          listener: (ev: Event) => {
            const select = (ev.target as HTMLElement).querySelector("select");
            select?.blur();
          },
        },
      ],
      children: [
        Object.assign({}, elementProps, {
          tag: "select",
          listeners: [
            {
              type: "focus",
              listener: (ev: Event) => {
                const select = ev.target as HTMLElement;
                const dropdown = select.parentElement?.querySelector(
                  ".dropdown-content",
                ) as HTMLDivElement;
                dropdown && (dropdown.style.display = "block");
                select.setAttribute("focus", "true");
              },
            },
            {
              type: "blur",
              listener: (ev: Event) => {
                const select = ev.target as HTMLElement;
                const dropdown = select.parentElement?.querySelector(
                  ".dropdown-content",
                ) as HTMLDivElement;
                dropdown && (dropdown.style.display = "none");
                select.removeAttribute("focus");
              },
            },
          ],
        }),
        {
          tag: "div",
          classList: ["dropdown-content"],
          children: elementProps.children?.map((option) => ({
            tag: "p",
            attributes: {
              value: option.properties?.value,
            },
            properties: {
              innerHTML:
                option.properties?.innerHTML || option.properties?.textContent,
            },
            classList: ["dropdown-item"],
            listeners: [
              {
                type: "click",
                listener: (ev: Event) => {
                  const select = (ev.target as HTMLElement).parentElement
                    ?.previousElementSibling as HTMLSelectElement;
                  select &&
                    (select.value =
                      (ev.target as HTMLElement).getAttribute("value") || "");
                  select?.blur();
                },
              },
            ],
          })),
        },
      ],
    };
    for (const key in elementProps) {
      delete elementProps[key as keyof ElementProps];
    }
    Object.assign(elementProps, customSelectProps);
  } else if (elementProps.tag === "a") {
    const href = (elementProps?.properties?.href || "") as string;
    elementProps.properties ??= {};
    elementProps.properties.href = "javascript:void(0);";
    elementProps.attributes ??= {};
    elementProps.attributes["zotero-href"] = href;
    elementProps.listeners ??= [];
    elementProps.listeners.push({
      type: "click",
      listener: (ev: Event) => {
        const href = (ev.target as HTMLLinkElement)?.getAttribute(
          "zotero-href",
        );
        href && uiTool.getGlobal("Zotero").launchURL(href);
      },
    });
    elementProps.classList ??= [];
    elementProps.classList.push("zotero-text-link");
  }
  if (checkChildren) {
    elementProps.children?.forEach((child) => replaceElement(child, uiTool));
  }
}

const style = `
html {
  color-scheme: light dark;
}
.zotero-text-link {
  -moz-user-focus: normal;
  color: -moz-nativehyperlinktext;
  text-decoration: underline;
  border: 1px solid transparent;
  cursor: pointer;
}
.dropdown {
  position: relative;
  display: inline-block;
}
.dropdown-content {
  display: none;
  position: absolute;
  background-color: var(--material-toolbar);
  min-width: 160px;
  box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, 0.5);
  border-radius: 5px;
  padding: 5px 0 5px 0;
  z-index: 999;
}
.dropdown-item {
  margin: 0px;
  padding: 5px 10px 5px 10px;
}
.dropdown-item:hover {
  background-color: var(--fill-quinary);
}
`;

interface DialogData {
  [key: string | number | symbol]: any;
  loadLock?: {
    resolve: () => void;
    reject: (reason?: any) => void;
    promise: Promise<void>;
  };
  loadCallback?: () => void;
  unloadLock?: {
    resolve: () => void;
    reject: (reason?: any) => void;
    promise: Promise<void>;
  };
  unloadCallback?: () => void;
  beforeUnloadCallback?: () => void;
  l10nFiles?: string | string[];
}
