import { version } from "../package.json";
import { hasPrivilegedAPIs, hasZotero, requireEnv } from "./env.js";

/**
 * Basic APIs with Zotero 6 & newer (7) compatibility.
 * See also https://www.zotero.org/support/dev/zotero_7_for_developers
 */
export class BasicTool {
  /**
   * configurations.
   */
  protected _basicOptions: BasicOptions;

  static _version = version;

  /**
   * Get version - checks subclass first, then falls back to parent
   */
  get _version() {
    return version;
  }

  public get basicOptions(): BasicOptions {
    return this._basicOptions;
  }

  /**
   * Get the plugin ID. Throws if not set.
   * Must be set via constructor options before calling any Zotero API
   * that requires a plugin ID.
   */
  public getPluginID(): string {
    const id = this._basicOptions.api.pluginID;
    if (!id) {
      throw new Error(
        "[zotero-plugin-toolkit] pluginID is not set. " +
          "Pass { api: { pluginID: '...' } } in the constructor options.",
      );
    }
    return id;
  }

  /**
   *
   * @param data Pass an BasicTool instance to copy its options.
   */
  constructor(data?: BasicTool | BasicOptionsInput) {
    this._basicOptions = {
      log: {
        _type: "toolkitlog",
        disableConsole: false,
        disableZLog: false,
        prefix: "",
      },
      api: {
        pluginID: "",
      },
      listeners: {
        callbacks: {
          onMainWindowLoad: new Set(),
          onMainWindowUnload: new Set(),
          onPluginUnload: new Set(),
        },
        _mainWindow: undefined,
        _plugin: undefined,
      },
    };

    this.updateOptions(data);
  }

  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero" | "zotero"): _ZoteroTypes.Zotero;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "ZoteroPane" | "ZoteroPane_Local"): _ZoteroTypes.ZoteroPane;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero_Tabs"): _ZoteroTypes.Zotero_Tabs;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero_File_Interface"): any;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero_File_Exporter"): any;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero_LocateMenu"): any;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero_Report_Interface"): any;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero_Timeline_Interface"): any;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "Zotero_Tooltip"): any;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "ZoteroContextPane"): _ZoteroTypes.ZoteroContextPane;
  /**
   * @alpha
   * @param k
   */
  getGlobal(k: "ZoteroItemPane"): any;
  /**
   * @alpha
   * @param k
   */
  getGlobal<
    K extends keyof typeof globalThis,
    GLOBAL extends typeof globalThis,
  >(k: K): GLOBAL[K];
  /**
   * Get global variables.
   * @param k Global variable name, `Zotero`, `ZoteroPane`, `window`, `document`, etc.
   */
  getGlobal(k: string): any;
  getGlobal(k: string) {
    if (typeof globalThis[k as keyof typeof globalThis] !== "undefined") {
      return globalThis[k as keyof typeof globalThis];
    }
    const _Zotero = BasicTool.getZotero();
    try {
      const window = _Zotero.getMainWindow();
      switch (k) {
        case "Zotero":
        case "zotero":
          return _Zotero;
        case "window":
          return window;
        case "windows":
          return _Zotero.getMainWindows();
        case "document":
          return window.document;
        case "ZoteroPane":
        case "ZoteroPane_Local":
          return _Zotero.getActiveZoteroPane();
        default:
          return window[k as any] as unknown;
      }
    } catch (e) {
      Zotero.logError(e as Error);
    }
  }

  /**
   * If it's an XUL element
   * @param elem
   */
  isXULElement(elem: Element): boolean {
    return (
      elem.namespaceURI ===
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    );
  }

  /**
   * Create an XUL element
   *
   * For Zotero 6, use `createElementNS`;
   *
   * For Zotero 7+, use `createXULElement`.
   * @param doc
   * @param type
   * @example
   * Create a `<menuitem>`:
   * ```ts
   * const compat = new ZoteroCompat();
   * const doc = compat.getWindow().document;
   * const elem = compat.createXULElement(doc, "menuitem");
   * ```
   */
  createXULElement(doc: Document, type: string): XULElement {
    if (typeof (doc as any).createXULElement !== "function") {
      throw new TypeError(
        `[zotero-plugin-toolkit] createXULElement is not available on this document. ` +
          `XUL element creation requires a chrome document (privileged context).`,
      );
    }
    // @ts-expect-error doc.createXULElement returns XUL.Element
    return doc.createXULElement(type);
  }

  /**
   * Output to both Zotero.debug and console.log
   * @param data e.g. string, number, object, ...
   */
  log(...data: any) {
    if (data.length === 0) {
      return;
    }
    let _Zotero: _ZoteroTypes.Zotero | undefined;
    try {
      if (typeof Zotero !== "undefined") {
        _Zotero = Zotero;
      } else {
        _Zotero = BasicTool.getZotero();
      }
    } catch {}
    // If logOption is not provides, use the global one.
    let options: typeof this._basicOptions.log;
    if (data[data.length - 1]?._type === "toolkitlog") {
      options = data.pop();
    } else {
      options = this._basicOptions.log;
    }
    try {
      if (options.prefix) {
        data.splice(0, 0, options.prefix);
      }
      if (!options.disableConsole) {
        // console is available in all environments (privileged, unprivileged, HTML windows, workers)
        // eslint-disable-next-line no-console -- intentional logging method
        if (console.groupCollapsed) {
          // eslint-disable-next-line no-console -- intentional logging method
          console.groupCollapsed(...data);
        } else {
          // eslint-disable-next-line no-console -- intentional logging method
          console.group(...data);
        }
        // eslint-disable-next-line no-console -- intentional logging method
        console.trace();
        // eslint-disable-next-line no-console -- intentional logging method
        console.groupEnd();
      }
      if (!options.disableZLog) {
        if (typeof _Zotero === "undefined") {
          return;
        }
        _Zotero.debug(
          data
            .map((d: any) => {
              try {
                return typeof d === "object" ? JSON.stringify(d) : String(d);
              } catch {
                _Zotero!.debug(d);
                return "";
              }
            })
            .join("\n"),
        );
      }
    } catch (e: unknown) {
      if (_Zotero) Zotero.logError(e as Error);
      else {
        console.error(e);
      }
    }
  }

  /**
   * Add a Zotero event listener callback
   * @param type Event type
   * @param callback Event callback
   */
  addListenerCallback<T extends keyof ListenerCallbackMap>(
    type: T,
    callback: ListenerCallbackMap[T],
  ) {
    if (["onMainWindowLoad", "onMainWindowUnload"].includes(type)) {
      this._ensureMainWindowListener();
    }
    if (type === "onPluginUnload") {
      this._ensurePluginListener();
    }
    this._basicOptions.listeners.callbacks[type].add(callback);
  }

  /**
   * Remove a Zotero event listener callback
   * @param type Event type
   * @param callback Event callback
   */
  removeListenerCallback<T extends keyof ListenerCallbackMap>(
    type: T,
    callback: ListenerCallbackMap[T],
  ) {
    this._basicOptions.listeners.callbacks[type].delete(callback);
    // Remove listener if no callback
    this._ensureRemoveListener();
  }

  /**
   * Remove all Zotero event listener callbacks when the last callback is removed.
   */
  protected _ensureRemoveListener() {
    const { listeners } = this._basicOptions;
    if (
      listeners._mainWindow &&
      listeners.callbacks.onMainWindowLoad.size === 0 &&
      listeners.callbacks.onMainWindowUnload.size === 0
    ) {
      if (hasPrivilegedAPIs()) {
        Services.wm.removeListener(listeners._mainWindow);
      }
      delete listeners._mainWindow;
    }
    if (listeners._plugin && listeners.callbacks.onPluginUnload.size === 0) {
      Zotero.Plugins.removeObserver(listeners._plugin);
      delete listeners._plugin;
    }
  }

  /**
   * Ensure the main window listener is registered.
   */
  protected _ensureMainWindowListener() {
    if (this._basicOptions.listeners._mainWindow) {
      return;
    }
    if (!hasPrivilegedAPIs()) {
      this.log(
        "[zotero-plugin-toolkit] Main window listeners (Services.wm) are not available in unprivileged mode. " +
          "onMainWindowLoad/onMainWindowUnload callbacks will not fire automatically.",
      );
      return;
    }
    const mainWindowListener: nsIWindowMediatorListener = {
      onOpenWindow: (xulWindow) => {
        const domWindow = xulWindow.docShell.domWindow as Window;
        const onload = async () => {
          domWindow.removeEventListener("load", onload, false);
          if (
            domWindow.location.href !==
            "chrome://zotero/content/zoteroPane.xhtml"
          ) {
            return;
          }
          for (const cbk of this._basicOptions.listeners.callbacks
            .onMainWindowLoad) {
            try {
              cbk(domWindow);
            } catch (e) {
              this.log(e);
            }
          }
        };
        domWindow.addEventListener("load", () => onload(), false);
      },
      onCloseWindow: async (xulWindow) => {
        const domWindow = xulWindow.docShell.domWindow as Window;
        if (
          domWindow.location.href !== "chrome://zotero/content/zoteroPane.xhtml"
        ) {
          return;
        }
        for (const cbk of this._basicOptions.listeners.callbacks
          .onMainWindowUnload) {
          try {
            cbk(domWindow);
          } catch (e) {
            this.log(e);
          }
        }
      },
    };
    this._basicOptions.listeners._mainWindow = mainWindowListener;
    Services.wm.addListener(mainWindowListener);
  }

  /**
   * Ensure the plugin listener is registered.
   * In unprivileged mode, Zotero.Plugins is not available,
   * so callers must use {@link dispose} for manual cleanup.
   */
  protected _ensurePluginListener() {
    if (this._basicOptions.listeners._plugin) {
      return;
    }
    if (!hasZotero()) {
      return;
    }
    if (!hasPrivilegedAPIs()) {
      // Zotero.Plugins.addObserver is not available in unprivileged mode.
      // Callers must use dispose() for cleanup.
      return;
    }
    const pluginListener = {
      shutdown: (
        ...args: Parameters<
          NonNullable<_ZoteroTypes.Plugins.observer["shutdown"]>
        >
      ) => {
        for (const cbk of this._basicOptions.listeners.callbacks
          .onPluginUnload) {
          try {
            cbk(...args);
          } catch (e) {
            this.log(e);
          }
        }
      },
    };
    this._basicOptions.listeners._plugin = pluginListener;
    Zotero.Plugins.addObserver(pluginListener);
  }

  updateOptions(source?: BasicTool | BasicOptionsInput) {
    if (!source) {
      return this;
    }
    if (source instanceof BasicTool) {
      this._basicOptions = source._basicOptions;
    } else {
      // Deep-merge partial input into existing options
      if (source.log) {
        Object.assign(this._basicOptions.log, source.log);
      }
      if (source.api) {
        Object.assign(this._basicOptions.api, source.api);
      }
      if (source.listeners) {
        Object.assign(this._basicOptions.listeners, source.listeners);
      }
    }
    return this;
  }

  /**
   * Manually trigger cleanup for this tool instance.
   * Fires all registered `onPluginUnload` callbacks.
   * Use this in unprivileged mode where Zotero.Plugins.addObserver
   * is not available and auto-unregister does not work.
   */
  dispose() {
    for (const cbk of this._basicOptions.listeners.callbacks.onPluginUnload) {
      try {
        cbk(
          {
            id: this.getPluginID(),
            version: "",
            rootURI: "",
          },
          0,
        );
      } catch (e) {
        this.log(e);
      }
    }
  }

  static getZotero(): _ZoteroTypes.Zotero {
    if (typeof Zotero !== "undefined") {
      return Zotero;
    }
    if (hasPrivilegedAPIs()) {
      const { Zotero: _Zotero } = ChromeUtils.importESModule(
        "chrome://zotero/content/zotero.mjs",
      );
      return _Zotero;
    }
    throw new Error(
      "[zotero-plugin-toolkit] Zotero global is not available and cannot be imported in this environment.",
    );
  }
}

export interface BasicOptions {
  log: {
    readonly _type: "toolkitlog";
    disableConsole: boolean;
    disableZLog: boolean;
    prefix: string;
  };
  api: {
    pluginID: string;
  };
  listeners: {
    _mainWindow?: any;
    _plugin?: _ZoteroTypes.Plugins.observer;
    callbacks: {
      [K in keyof ListenerCallbackMap]: Set<ListenerCallbackMap[K]>;
    };
  };
}

/**
 * Input type for constructing BasicTool/subclasses.
 * All fields are optional and will be merged with defaults.
 */
export type BasicOptionsInput = {
  [K in keyof BasicOptions]?: Partial<BasicOptions[K]>;
};

export abstract class ManagerTool extends BasicTool {
  abstract register(...data: any[]): any;
  abstract unregister(...data: any[]): any;
  /**
   * Unregister everything
   */
  abstract unregisterAll(): any;

  protected _ensureAutoUnregisterAll() {
    this.addListenerCallback("onPluginUnload", (params, _reason) => {
      if (params.id !== this.getPluginID()) {
        return;
      }
      this.unregisterAll();
    });
  }
}

export function unregister(tools: { [key: string | number]: any }) {
  Object.values(tools).forEach((tool) => {
    if (
      tool instanceof ManagerTool ||
      typeof tool?.unregisterAll === "function"
    ) {
      tool.unregisterAll();
    }
  });
}

export function makeHelperTool<T extends typeof HelperTool>(
  cls: T,
  options: BasicTool | BasicOptionsInput,
): T;
export function makeHelperTool<T>(
  cls: T,
  options: BasicTool | BasicOptionsInput,
): T;
export function makeHelperTool(
  cls: any,
  options: BasicTool | BasicOptionsInput,
) {
  return new Proxy(cls, {
    construct(target, args) {
      // eslint-disable-next-line new-cap
      const _origin = new cls(...args);
      if (_origin instanceof BasicTool) {
        _origin.updateOptions(options);
      } else {
        _origin._version = BasicTool._version;
      }
      return _origin;
    },
  });
}

// Make compatible import between fx128 (import jsm) and fx140 (importESModule mjs)
export function _importESModule(path: string): any {
  requireEnv("privileged", "_importESModule");

  // Since the `Zotero` or `Services` might not be available,
  // we directly check `ChromeUtils` for import.
  if (typeof ChromeUtils.import === "undefined") {
    return ChromeUtils.importESModule(path, { global: "contextual" });
  }

  // If matching *.sys.mjs, convert to *.jsm
  if (path.endsWith(".sys.mjs")) {
    path = path.replace(/\.sys\.mjs$/, ".jsm");
  }
  return ChromeUtils.import(path);
}

declare interface ListenerCallbackMap {
  onMainWindowLoad: (win: Window) => void;
  onMainWindowUnload: (win: Window) => void;
  onPluginUnload: (
    ...args: Parameters<NonNullable<_ZoteroTypes.Plugins.observer["shutdown"]>>
  ) => void;
}

// eslint-disable-next-line unused-imports/no-unused-vars
declare class HelperTool {
  constructor(...args: any);
  updateOptions: BasicTool["updateOptions"];
}
