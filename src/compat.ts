import { PrefPaneOptions } from "./options";
import { createXULElement, getGlobal, log } from "./utils";

/**
 * Consistent APIs for Zotero 6 & newer (7).
 * @public
 */
export class ZoteroCompat {
  /**
   * Get global variables
   */
  getGlobal: typeof getGlobal;
  /**
   * Consistent APIs for Zotero 6 & newer (7).
   */
  public prefPaneCache: { win: Window; listeners: any[]; ids: string[] };
  constructor() {
    this.getGlobal = getGlobal;
    this.prefPaneCache = { win: undefined, listeners: [], ids: [] };
  }

  /**
   * Get Zotero instance. An alias of `getGlobal("Zotero")`.
   *  */
  getZotero(): _ZoteroConstructable {
    return getGlobal("Zotero");
  }
  /**
   * Get Zotero Main Window. An alias of `getGlobal("window")`.
   */
  getWindow(): Window {
    return getGlobal("window");
  }
  /**
   * Check if it's running on Zotero 7 (Firefox 102)
   */
  isZotero7(): boolean {
    return Zotero.platformMajorVersion >= 102;
  }
  /**
   * Get DOMParser.
   *
   * For Zotero 6: mainWindow.DOMParser or nsIDOMParser
   *
   * For Zotero 7: Firefox 102 support DOMParser natively
   */
  getDOMParser(): DOMParser {
    if (this.isZotero7()) {
      return new DOMParser();
    }
    try {
      return new (getGlobal("DOMParser") as typeof DOMParser)();
    } catch (e) {
      return Components.classes[
        "@mozilla.org/xmlextras/domparser;1"
      ].createInstance(Components.interfaces.nsIDOMParser);
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
   * Ceate a `<menuitem>`:
   * ```ts
   * const compat = new ZoteroCompat();
   * const doc = compat.getWindow().document;
   * const elem = compat.createXULElement(doc, "menuitem");
   * ```
   */
  createXULElement(doc: Document, type: string): XUL.Element {
    return createXULElement(doc, type);
  }
  /**
   * Parse XHTML to XUL fragment. For Zotero 6.
   *
   * To load preferences from a Zotero 7's `.xhtml`, use this method to parse it.
   * @param str xhtml raw text
   * @param entities dtd file list ("chrome://xxx.dtd")
   * @param defaultXUL true for default XUL namespace
   */
  parseXHTMLToFragment(
    str: string,
    entities: string[] = [],
    defaultXUL = true
  ): DocumentFragment {
    // Adapted from MozXULElement.parseXULToFragment

    /* eslint-disable indent */
    let parser = this.getDOMParser();
    // parser.forceEnableXULXBL();
    const xulns =
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    const htmlns = "http://www.w3.org/1999/xhtml";
    const wrappedStr = `${
      entities.length
        ? `<!DOCTYPE bindings [ ${entities.reduce((preamble, url, index) => {
            return (
              preamble +
              `<!ENTITY % _dtd-${index} SYSTEM "${url}"> %_dtd-${index}; `
            );
          }, "")}]>`
        : ""
    }
      <html:div xmlns="${defaultXUL ? xulns : htmlns}"
          xmlns:xul="${xulns}" xmlns:html="${htmlns}">
      ${str}
      </html:div>`;
    log(wrappedStr, parser);
    let doc = parser.parseFromString(wrappedStr, "text/xml");
    /* eslint-enable indent */
    log(doc);

    if (doc.documentElement.localName === "parsererror") {
      throw new Error("not well-formed XHTML");
    }

    // We use a range here so that we don't access the inner DOM elements from
    // JavaScript before they are imported and inserted into a document.
    let range = doc.createRange();
    range.selectNodeContents(doc.querySelector("div"));
    return range.extractContents();
  }
  /**
   * Register a preference pane in Zotero 6 from an xhtml
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
   *   if (compat.isZotero7()) {
   *     Zotero.PreferencePanes.register(prefOptions);
   *   } else {
   *     compat.registerPrefPane(prefOptions);
   *   }
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
  registerPrefPane(options: PrefPaneOptions) {
    const _initImportedNodesPostInsert = (container) => {
      const _observerSymbols = new Map();
      const Zotero = this.getZotero();
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
                node.nodeType == Node.ELEMENT_NODE &&
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
              log("registerPrefPane:detected", options);
              const Zotero = this.getZotero();
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
              const frag = this.parseXHTMLToFragment(
                src,
                options.extraDTD,
                options.defaultXUL
              );
              log(frag);
              const prefWindow = win.document.querySelector("prefwindow");
              prefWindow.appendChild(frag);
              const prefPane = win.document.querySelector(`#${options.id}`);
              // @ts-ignore
              prefWindow.addPane(prefPane);
              // Resize window, otherwise the new prefpane may be placed out of the window
              // @ts-ignore
              win.sizeToContent();
              this.prefPaneCache.win = win;
              this.prefPaneCache.listeners.push(windowListener);
              this.prefPaneCache.ids.push(options.id);
              // Binding preferences
              _initImportedNodesPostInsert(prefPane);
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
  /**
   * Unregister all preference panes added with this instance
   *
   * Called on exiting
   */
  unregisterPrefPane() {
    this.prefPaneCache.listeners.forEach((l) => {
      Services.wm.removeListener(l);
      l.onOpenWindow = undefined;
    });
    const win = this.prefPaneCache.win;
    if (win && !win.closed) {
      this.prefPaneCache.ids.forEach((id) =>
        win.document.querySelector(id)?.remove()
      );
    }
  }
}
