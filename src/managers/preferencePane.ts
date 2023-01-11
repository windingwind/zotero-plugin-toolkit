import { BasicOptions, BasicTool } from "../basic";
import { UITool } from "../tools/ui";
import { ManagerTool } from "../basic";

/**
 * Register preference pane from Zotero 7's `xtml`, for Zotero 6 & 7.
 */
export class PreferencePaneManager extends ManagerTool {
  private ui: UITool;
  private prefPaneCache: { win: Window; listeners: { [id: string]: any } };
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.ui = new UITool(this);
    this.prefPaneCache = { win: undefined, listeners: {} };
  }

  /**
   * Register a preference pane from an xhtml, for Zotero 6 & 7.
   * @remarks
   * Don't forget to call `unregisterPrefPane` on exit.
   * @remarks
   * options:
   * ```ts
   * export interface PrefPaneOptions {
   *   pluginID: string;
   *   src: string;
   *   id?: string;
   *   parent?: string;
   *   label?: string;
   *   image?: string;
   *   extraDTD?: string[];
   *   scripts?: string[];
   *   defaultXUL?: boolean;
   *   // Only for Zotero 6
   *   onload?: (win: Window) => any;
   * }
   * ```
   *
   * @param options See {@link https://github.com/windingwind/zotero-plugin-toolkit/blob/main/src/options.ts | source code:options.ts}
   * @example
   * ```ts
   * const compat = new ZoteroCompat();
   * const tool = new ZoteroTool();
   * function initPrefs() {
   *   const prefOptions = {
   *     pluginID: addonID,
   *     src: rootURI + "chrome/content/preferences.xhtml",
   *     label: "Template",
   *     image: `chrome://${addonRef}/content/icons/favicon.png`,
   *     extraDTD: [`chrome://${addonRef}/locale/overlay.dtd`],
   *     defaultXUL: true,
   *     onload: (win: Window) => {
   *       // Triggered after loading
   *       return;
   *     },
   *   };
   *   compat.registerPrefPane(prefOptions);
   * };
   *
   * function unInitPrefs() {
   *   if (!compat.isZotero7()) {
   *     compat.unregisterPrefPane();
   *   }
   * };
   * ```
   * // bootstrap.js:startup
   * initPrefs();
   *
   * // bootstrap.js:shutsown
   * unInitPrefs();
   */
  register(options: PrefPaneOptions) {
    if (this.isZotero7()) {
      this.getGlobal("Zotero").PreferencePanes.register(options);
      return;
    }
    const _initImportedNodesPostInsert = (container) => {
      const _observerSymbols = new Map();
      const Zotero = this.getGlobal("Zotero");
      const window = container.ownerGlobal;
      let useChecked = (elem) =>
        (elem instanceof window.HTMLInputElement && elem.type == "checkbox") ||
        elem.tagName == "checkbox";

      let syncFromPref = (elem, preference) => {
        let value = Zotero.Prefs.get(preference, true);
        if (useChecked(elem)) {
          elem.checked = value;
        } else {
          elem.value = value;
        }
        elem.dispatchEvent(new window.Event("syncfrompreference"));
      };

      // We use a single listener function shared between all elements so we can easily detach it later
      let syncToPrefOnModify = (event) => {
        if (event.currentTarget.getAttribute("preference")) {
          let value = useChecked(event.currentTarget)
            ? event.currentTarget.checked
            : event.currentTarget.value;
          Zotero.Prefs.set(
            event.currentTarget.getAttribute("preference"),
            value,
            true
          );
          event.currentTarget.dispatchEvent(
            new window.Event("synctopreference")
          );
        }
      };

      let attachToPreference = (elem, preference) => {
        Zotero.debug(`Attaching <${elem.tagName}> element to ${preference}`);
        // @ts-ignore
        let symbol = Zotero.Prefs.registerObserver(
          preference,
          () => syncFromPref(elem, preference),
          true
        );
        _observerSymbols.set(elem, symbol);
      };

      let detachFromPreference = (elem) => {
        if (_observerSymbols.has(elem)) {
          Zotero.debug(`Detaching <${elem.tagName}> element from preference`);
          // @ts-ignore
          Zotero.Prefs.unregisterObserver(this._observerSymbols.get(elem));
          _observerSymbols.delete(elem);
        }
      };

      // Activate `preference` attributes
      for (let elem of container.querySelectorAll("[preference]")) {
        let preference = elem.getAttribute("preference");
        if (container.querySelector("preferences > preference#" + preference)) {
          Zotero.warn(
            "<preference> is deprecated -- `preference` attribute values " +
              "should be full preference keys, not <preference> IDs"
          );
          preference = container
            .querySelector("preferences > preference#" + preference)
            .getAttribute("name");
        }

        attachToPreference(elem, preference);

        elem.addEventListener(
          this.isXULElement(elem) ? "command" : "input",
          syncToPrefOnModify
        );

        // Set timeout before populating the value so the pane can add listeners first
        window.setTimeout(() => {
          syncFromPref(elem, preference);
        });
      }

      new window.MutationObserver((mutations) => {
        for (let mutation of mutations) {
          if (mutation.type == "attributes") {
            let target = mutation.target as Element;
            detachFromPreference(target);
            if (target.hasAttribute("preference")) {
              attachToPreference(target, target.getAttribute("preference"));
              target.addEventListener(
                this.isXULElement(target) ? "command" : "input",
                syncToPrefOnModify
              );
            }
          } else if (mutation.type == "childList") {
            for (let node of mutation.removedNodes) {
              detachFromPreference(node);
            }
            for (let node of mutation.addedNodes) {
              if (
                node.nodeType == window.Node.ELEMENT_NODE &&
                (node as Element).hasAttribute("preference")
              ) {
                attachToPreference(
                  node,
                  (node as Element).getAttribute("preference")
                );
                node.addEventListener(
                  this.isXULElement(node as Element) ? "command" : "input",
                  syncToPrefOnModify
                );
              }
            }
          }
        }
      }).observe(container, {
        childList: true,
        subtree: true,
        attributeFilter: ["preference"],
      });

      // parseXULToFragment() doesn't convert oncommand attributes into actual
      // listeners, so we'll do it here
      for (let elem of container.querySelectorAll("[oncommand]")) {
        elem.oncommand = elem.getAttribute("oncommand");
      }

      for (let child of container.children) {
        child.dispatchEvent(new window.Event("load"));
      }
    };
    const windowListener = {
      onOpenWindow: (xulWindow) => {
        const win: Window = xulWindow
          .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
          .getInterface(Components.interfaces.nsIDOMWindow);
        win.addEventListener(
          "load",
          async () => {
            if (
              win.location.href ===
              "chrome://zotero/content/preferences/preferences.xul"
            ) {
              this.log("registerPrefPane:detected", options);
              const Zotero = this.getGlobal("Zotero");
              options.id ||
                (options.id = `plugin-${Zotero.Utilities.randomString()}-${new Date().getTime()}`);
              const contenrOrXHR = await Zotero.File.getContentsAsync(
                options.src
              );
              const content =
                typeof contenrOrXHR === "string"
                  ? contenrOrXHR
                  : (contenrOrXHR as any as XMLHttpRequest).response;
              const src = `<prefpane xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul" id="${
                options.id
              }" insertafter="zotero-prefpane-advanced" label="${
                options.label || options.pluginID
              }" image="${options.image || ""}">
                ${content}
                </prefpane>`;
              const frag = this.ui.parseXHTMLToFragment(
                src,
                options.extraDTD,
                options.defaultXUL
              );
              this.log(frag);
              const prefWindow = win.document.querySelector("prefwindow");
              prefWindow.appendChild(frag);
              const prefPane = win.document.querySelector(`#${options.id}`);
              // @ts-ignore
              prefWindow.addPane(prefPane);
              // Resize window, otherwise the new prefpane may be placed out of the window
              // @ts-ignore
              win.sizeToContent();
              this.prefPaneCache.win = win;
              this.prefPaneCache.listeners[options.id] = windowListener;
              // Binding preferences
              _initImportedNodesPostInsert(prefPane);
              if (options.scripts?.length) {
                options.scripts.forEach((script) =>
                  Services.scriptloader.loadSubScript(script, win)
                );
              }
              if (options.onload) {
                options.onload(win);
              }
            }
          },
          false
        );
      },
    };
    Services.wm.addListener(windowListener);
  }

  unregister(id: string) {
    const idx = Object.keys(this.prefPaneCache.listeners).indexOf(id);
    if (idx < 0) {
      return false;
    }
    const listner = this.prefPaneCache.listeners[id];
    Services.wm.removeListener(listner);
    listner.onOpenWindow = undefined;
    const win = this.prefPaneCache.win;
    if (win && !win.closed) {
      win.document.querySelector(`#${id}`)?.remove();
    }
    delete this.prefPaneCache.listeners[id];
    return true;
  }

  /**
   * Unregister all preference panes added with this instance
   *
   * Called on exiting
   */
  unregisterAll() {
    for (const id in this.prefPaneCache.listeners) {
      this.unregister(id);
    }
  }
}

export interface PrefPaneOptions {
  pluginID: string;
  src: string;
  id?: string;
  parent?: string;
  label?: string;
  image?: string;
  extraDTD?: string[];
  scripts?: string[];
  defaultXUL?: boolean;
  // Only for Zotero 6
  onload?: (win: Window) => any;
}
