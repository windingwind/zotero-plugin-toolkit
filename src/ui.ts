import { ElementOptions, MenuitemOptions } from "./options";
import { ZoteroReaderTool } from "./reader";
import { createXULElement, log, getGlobal } from "./utils";

/**
 * UI APIs.
 * @public
 */
export class ZoteroUI {
  /**
   * Store elements created with this instance
   *
   * @remarks
   * > What is this for?
   *
   * In boostrap plugins, elements must be manually maintained and removed on exiting.
   *
   * This API does this for you.
   */
  addonElements: Element[];
  /**
   * If elements created with `createElement` should be recorded.
   *
   * @remarks
   * > What is this for?
   *
   * In boostrap plugins, elements must be manually maintained and removed on exiting.
   *
   * If this is `false`, newly created elements with `createElement` will not be maintained.
   */
  enableElementRecordGlobal: boolean;
  private readerTabCache: {
    optionsList: {
      tabId: string;
      tabLabel: string;
      panelId: string;
      renderPanelHook: (
        panel: XUL.TabPanel | undefined,
        ownerDeck: XUL.Deck,
        ownerWindow: Window,
        readerInstance: _ZoteroReaderInstance
      ) => void;
      targetIndex: number;
      selectPanel?: boolean;
    }[];
    observer: MutationObserver;
    readerTool: ZoteroReaderTool;
    initializeLock: _ZoteroPromiseObject;
  };
  constructor() {
    this.addonElements = [];
    this.enableElementRecordGlobal = true;
    this.readerTabCache = {
      optionsList: [],
      observer: undefined,
      readerTool: new ZoteroReaderTool(),
      initializeLock: undefined,
    };
  }
  /**
   * Create an element on doc under specific namespace
   * The element will be maintained by toolkit.
   *
   * @remarks
   * > What is this for?
   *
   * In boostrap plugins, elements must be manually maintained and removed on exiting.
   *
   * This API does this for you.
   *
   * @param doc target document, e.g. Zotero main window.document
   * @param tagName element tag name, e.g. `hbox`, `div`
   * @param namespace default "html"
   * @param enableElementRecord If current element will be recorded and maintained by toolkit. If not set, use this.enableElementRecordGlobal
   * @example
   * Create an element
   * ```ts
   * // assume tool: ZoteroTool, ui: ZoteroUI exist
   * const doc = tool.getWindow().document;
   * const elem = ui.createElement(doc, "hbox", "xul");
   * ```
   * Please call `ui.removeAddonElements()` on shutdown.
   */
  createElement(
    doc: Document,
    tagName: string,
    namespace: "html" | "svg" | "xul" = "html",
    enableElementRecord: boolean = undefined
  ): HTMLElement | XUL.Element | SVGElement | DocumentFragment {
    namespace = namespace || "html";
    const namespaces = {
      html: "http://www.w3.org/1999/xhtml",
      svg: "http://www.w3.org/2000/svg",
    };
    let elem: HTMLElement | XUL.Element | SVGElement | DocumentFragment;
    if (tagName === "fragment") {
      elem = doc.createDocumentFragment();
      return elem;
    } else if (namespace === "xul") {
      elem = createXULElement(doc, tagName);
    } else {
      elem = doc.createElementNS(namespaces[namespace], tagName) as
        | HTMLElement
        | SVGElement;
    }
    if (
      (typeof enableElementRecord !== "undefined" && enableElementRecord) ||
      this.enableElementRecordGlobal
    ) {
      this.addonElements.push(elem);
    }
    return elem;
  }
  /**
   * Remove all elements created by `createElement`.
   *
   * @remarks
   * > What is this for?
   *
   * In boostrap plugins, elements must be manually maintained and removed on exiting.
   *
   * This API does this for you.
   */
  removeAddonElements() {
    this.addonElements.forEach((e) => {
      try {
        e?.remove();
      } catch (e) {
        log(e);
      }
    });
  }
  /**
   * Create elements in batch, based on `createElement`.
   * 
   * The return element will also be maintained by toolkit.
   * 
   * @remarks
   * options:
   * ```ts
   * export interface ElementOptions {
   *   tag: string;
   *   id?: string;
   *   namespace?: "html" | "svg" | "xul";
   *   classList?: Array<string>;
   *   styles?: { [key: string]: string };
   *   directAttributes?: { [key: string]: string | boolean | number };
   *   attributes?: { [key: string]: string | boolean | number };
   *   listeners?: Array<{
   *     type: string;
   *     listener: EventListenerOrEventListenerObject | ((e: Event) => void);
   *     options?: boolean | AddEventListenerOptions;
   *   }>;
   *   checkExistanceParent?: HTMLElement;
   *   ignoreIfExists?: boolean;
   *   removeIfExists?: boolean;
   *   customCheck?: () => boolean;
   *   subElementOptions?: Array<ElementOptions>;
   * }
   * ```
   * 
   * @param doc 
   * @param options See {@link https://github.com/windingwind/zotero-plugin-toolkit/blob/main/src/options.ts | source code:options.ts}
   * @example
   * Create multiple menu item/menu. This code is part of Zotero Better Notes.
   * ```ts
   *  const imageSelected = () => {
   *    // Return false to skip current element
   *    return true;
   *  };
   *  
   *  const popup = document.getElementById("popup")!;

   *  const elementOptions = {
   *    tag: "fragment",
   *    subElementOptions: [
   *      {
   *        tag: "menuseparator",
   *        id: "menupopup-betternotessplitter",
   *        checkExistanceParent: popup,
   *        ignoreIfExists: true,
   *      },
   *      {
   *        tag: "menuitem",
   *        id: "menupopup-resizeImage",
   *        checkExistanceParent: popup,
   *        ignoreIfExists: true,
   *        attributes: { label: "Resize Image" },
   *        customCheck: imageSelected,
   *        listeners: [
   *          {
   *            type: "command",
   *            listener: (e) => {
   *              postMessage({ type: "resizeImage", width: 100 }, "   *  ");
   *            },
   *          ],
   *        ],
   *      },
   *    ],
   *  };
   *  
   *  const fragment = this._Addon.ZoteroViews.createXULElement(
   *    popup.ownerDocument,
   *    elementOptions
   *  );
   *  if (fragment) {
   *    popup.append(fragment);
   *  }
   * ```
   */
  creatElementsFromJSON(doc: Document, options: ElementOptions) {
    log(options);
    if (
      options.id &&
      (options.checkExistanceParent
        ? options.checkExistanceParent
        : doc
      ).querySelector(`#${options.id}`)
    ) {
      if (options.ignoreIfExists) {
        return doc.querySelector(`#${options.id}`);
      }
      if (options.removeIfExists) {
        doc.querySelector(`#${options.id}`).remove();
      }
    }
    if (options.customCheck && !options.customCheck()) {
      return undefined;
    }
    const element = this.createElement(doc, options.tag, options.namespace);

    let _DocumentFragment: typeof DocumentFragment;
    if (typeof DocumentFragment === "undefined") {
      _DocumentFragment = (doc as any).ownerGlobal.DocumentFragment;
    } else {
      _DocumentFragment = DocumentFragment;
    }
    if (!(element instanceof _DocumentFragment)) {
      if (options.id) {
        element.id = options.id;
      }
      if (options.styles && Object.keys(options.styles).length) {
        Object.keys(options.styles).forEach((k) => {
          const v = options.styles[k];
          typeof v !== "undefined" && (element.style[k] = v);
        });
      }
      if (
        options.directAttributes &&
        Object.keys(options.directAttributes).length
      ) {
        Object.keys(options.directAttributes).forEach((k) => {
          const v = options.directAttributes[k];
          typeof v !== "undefined" && (element[k] = v);
        });
      }
      if (options.attributes && Object.keys(options.attributes).length) {
        Object.keys(options.attributes).forEach((k) => {
          const v = options.attributes[k];
          typeof v !== "undefined" && element.setAttribute(k, String(v));
        });
      }
      // Add classes after attributes, as user may set the class attribute
      if (options.classList?.length) {
        element.classList.add(...options.classList);
      }
      if (options.listeners?.length) {
        options.listeners.forEach(({ type, listener, options }) => {
          typeof listener !== "undefined" &&
            element.addEventListener(type, listener, options);
        });
      }
    }

    if (options.subElementOptions?.length) {
      const subElements = options.subElementOptions
        .map((_options) => this.creatElementsFromJSON(doc, _options))
        .filter((e) => e);
      element.append(...subElements);
    }
    return element;
  }
  /**
   * Insert an menu item/menu(with popup)/menuseprator into a menupopup
   * @remarks
   * options:
   * ```ts
   * export interface MenuitemOptions {
   *   tag: "menuitem" | "menu" | "menuseparator";
   *   id?: string;
   *   label?: string;
   *   // data url (chrome://xxx.png) or base64 url (data:image/png;base64,xxx)
   *   icon?: string;
   *   class?: string;
   *   styles?: { [key: string]: string };
   *   hidden?: boolean;
   *   disabled?: boolean;
   *   oncommand?: string;
   *   commandListener?: EventListenerOrEventListenerObject;
   *   // Attributes below are used when type === "menu"
   *   popupId?: string;
   *   onpopupshowing?: string;
   *   subElementOptions?: Array<MenuitemOptions>;
   * }
   * ```
   * @param menuPopup
   * @param options See {@link https://github.com/windingwind/zotero-plugin-toolkit/blob/main/src/options.ts | source code:options.ts}
   * @param insertPosition
   * @param anchorElement The menuitem will be put before/after `anchorElement`. If not set, put at start/end of the menupopup.
   * @example
   * Insert menuitem with icon into item menupopup
   * ```ts
   * const ui = new ZoteroUI();
   * // base64 or chrome:// url
   * const menuIcon = "chrome://addontemplate/content/icons/favicon@0.5x.png";
   * ui.insertMenuItem("item", {
   *   tag: "menuitem",
   *   id: "zotero-itemmenu-addontemplate-test",
   *   label: "Addon Template: Menuitem",
   *   oncommand: "alert('Hello World! Default Menuitem.')",
   *   icon: menuIcon,
   * });
   * ```
   * @example
   * Insert menu into file menupopup
   * ```ts
   * const ui = new ZoteroUI();
   * ui.insertMenuItem(
   *   "menuFile",
   *   {
   *     tag: "menu",
   *     label: "Addon Template: Menupopup",
   *     subElementOptions: [
   *       {
   *         tag: "menuitem",
   *         label: "Addon Template",
   *         oncommand: "alert('Hello World! Sub Menuitem.')",
   *       },
   *     ],
   *   },
   *   "before",
   *   Zotero.getMainWindow().document.querySelector(
   *     "#zotero-itemmenu-addontemplate-test"
   *   )
   * );
   * ```
   */
  insertMenuItem(
    menuPopup: XUL.MenuPopup | keyof typeof MenuSelector,
    options: MenuitemOptions,
    insertPosition: "before" | "after" = "after",
    anchorElement: XUL.Element = undefined
  ) {
    let popup: XUL.MenuPopup;
    if (typeof menuPopup === "string") {
      popup = getGlobal("document").querySelector(MenuSelector[menuPopup]);
    } else {
      popup = menuPopup;
    }
    if (!popup) {
      return false;
    }
    const doc: Document = popup.ownerDocument;
    const generateElementOptions = (
      menuitemOption: MenuitemOptions
    ): ElementOptions => {
      let elementOption: ElementOptions = {
        tag: menuitemOption.tag,
        id: menuitemOption.id,
        namespace: "xul",
        attributes: {
          label: menuitemOption.label,
          hidden: Boolean(menuitemOption.hidden),
          disaled: Boolean(menuitemOption.disabled),
          class: menuitemOption.class || "",
          oncommand: menuitemOption.oncommand,
        },
        classList: menuitemOption.classList,
        styles: menuitemOption.styles || {},
        listeners: [
          { type: "command", listener: menuitemOption.commandListener },
        ],
        subElementOptions: [],
      };
      if (menuitemOption.icon) {
        elementOption.attributes["class"] += " menuitem-iconic";
        elementOption.styles[
          "list-style-image"
        ] = `url(${menuitemOption.icon})`;
      }
      if (menuitemOption.tag === "menu") {
        elementOption.subElementOptions.push({
          tag: "menupopup",
          id: menuitemOption.popupId,
          namespace: "xul",
          attributes: { onpopupshowing: menuitemOption.onpopupshowing },
          subElementOptions: menuitemOption.subElementOptions.map(
            generateElementOptions
          ),
        });
      }
      return elementOption;
    };
    const menuItem = this.creatElementsFromJSON(
      doc,
      generateElementOptions(options)
    );
    if (!anchorElement) {
      anchorElement = (
        insertPosition === "after"
          ? popup.lastElementChild
          : popup.firstElementChild
      ) as XUL.Element;
    }
    anchorElement[insertPosition](menuItem);
  }

  /**
   * Register a tabpanel in library.
   * @remarks
   * If you don't want to remove the tab & panel in runtime, `unregisterLibraryTabPanel` is not a must.
   * 
   * The elements wiil be removed by `removeAddonElements`.
   * @param tabLabel Label of panel tab.
   * @param renderPanelHook Called when panel is ready. Add elements to the panel.
   * @param options Other optional parameters.
   * @param options.tabId ID of panel tab. Also used as unregister query. If not set, generate a random one.
   * @param options.panelId ID of panel container (XUL.TabPanel). If not set, generate a random one.
   * @param options.targetIndex Index of the inserted tab. Default the end of tabs.
   * @param options.selectPanel If the panel should be selected immediately.
   * @returns tabId. Use it for unregister.
   * @example
   * Register an extra library tabpanel into index 1.
   * ```ts
   * const ui = new ZoteroUI();
   * const libTabId = ui.registerLibraryTabPanel(
   *   "test",
   *   (panel: XUL.Element, win: Window) => {
   *     const elem = ui.creatElementsFromJSON(
   *       win.document,
   *       {
   *         tag: "vbox",
   *         namespace: "xul",
   *         subElementOptions: [
   *           {
   *             tag: "h2",
   *             directAttributes: {
   *               innerText: "Hello World!",
   *             },
   *           },
   *           {
   *             tag: "label",
   *             namespace: "xul",
   *             directAttributes: {
   *               value: "This is a library tab.",
   *             },
   *           },
   *           {
   *             tag: "button",
   *             directAttributes: {
   *               innerText: "Unregister",
   *             },
   *             listeners: [
   *               {
   *                 type: "click",
   *                 listener: () => {
   *                   ui.unregisterLibraryTabPanel(
   *                     libTabId
   *                   );
   *                 },
   *               },
   *             ],
   *           },
   *         ],
   *       }
   *     );
   *     panel.append(elem);
   *   },
   *   {
   *     targetIndex: 1,
   *   }
   * );
   * ```
   */
  registerLibraryTabPanel(
    tabLabel: string,
    renderPanelHook: (panel: XUL.TabPanel, ownerWindow: Window) => void,
    options?: {
      tabId?: string;
      panelId?: string;
      targetIndex?: number;
      selectPanel?: boolean;
    }
  ): string {
    options = options || {
      tabId: undefined,
      panelId: undefined,
      targetIndex: -1,
      selectPanel: false,
    };
    const window = getGlobal("window");
    const tabbox = window.document.querySelector(
      "#zotero-view-tabbox"
    ) as XUL.TabBox;
    const randomId = `${Zotero.Utilities.randomString()}-${new Date().getTime()}`;
    const tabId = options.tabId || `toolkit-readertab-${randomId}`;
    const panelId = options.panelId || `toolkit-readertabpanel-${randomId}`;
    const tab = this.creatElementsFromJSON(window.document, {
      tag: "tab",
      namespace: "xul",
      id: tabId,
      classList: [`toolkit-ui-tabs-${tabId}`],
      attributes: {
        label: tabLabel,
      },
      ignoreIfExists: true,
    }) as XUL.Tab;
    const tabpanel = this.creatElementsFromJSON(window.document, {
      tag: "tabpanel",
      namespace: "xul",
      id: panelId,
      classList: [`toolkit-ui-tabs-${tabId}`],
      ignoreIfExists: true,
    }) as XUL.TabPanel;
    const tabs = tabbox.querySelector("tabs");
    const tabpanels = tabbox.querySelector("tabpanels");
    const targetIndex =
      typeof options.targetIndex === "number" ? options.targetIndex : -1;
    if (targetIndex >= 0) {
      tabs.querySelectorAll("tab")[targetIndex].before(tab);
      tabpanels.querySelectorAll("tabpanel")[targetIndex].before(tabpanel);
    } else {
      tabs.appendChild(tab);
      tabpanels.appendChild(tabpanel);
    }
    if (options.selectPanel) {
      tabbox.selectedTab = tab;
    }
    renderPanelHook(tabpanel, window);
    return tabId;
  }

  /**
   * Unregister the library tabpanel.
   * @param tabId tab id
   */
  unregisterLibraryTabPanel(tabId: string) {
    this.removeTabPanel(tabId);
  }

  /**
   * Register a tabpanel for every reader.
   * @remarks
   * Don't forget to call `unregisterReaderTabPanel` on exit.
   * @remarks
   * Every time a tab reader is selected/opened, the hook will be called.
   * @param tabLabel Label of panel tab.
   * @param renderPanelHook Called when panel is ready. Add elements to the panel.
   *
   * The panel might be `undefined` when opening a PDF without parent item.
   *
   * The owner deck is the top container of right-side bar.
   *
   * The readerInstance is the reader of current tabpanel.
   * @param options Other optional parameters.
   * @param options.tabId ID of panel tab. Also used as unregister query. If not set, generate a random one.
   * @param options.panelId ID of panel container (XUL.TabPanel). If not set, generate a random one.
   * @param options.targetIndex Index of the inserted tab. Default the end of tabs.
   * @param options.selectPanel If the panel should be selected immediately.
   * @returns tabId. Use it for unregister.
   * @example
   * Register an extra reader tabpanel into index 1.
   * ```ts
   * const readerTabId = `${config.addonRef}-extra-reader-tab`;
   * this._Addon.toolkit.UI.registerReaderTabPanel(
   *   "test",
   *   (
   *     panel: XUL.Element,
   *     deck: XUL.Deck,
   *     win: Window,
   *     reader: _ZoteroReaderInstance
   *   ) => {
   *     if (!panel) {
   *       this._Addon.toolkit.Tool.log(
   *         "This reader do not have right-side bar. Adding reader tab skipped."
   *       );
   *       return;
   *     }
   *     this._Addon.toolkit.Tool.log(reader);
   *     const elem = this._Addon.toolkit.UI.creatElementsFromJSON(
   *       win.document,
   *       {
   *         tag: "vbox",
   *         id: `${config.addonRef}-${reader._instanceID}-extra-reader-tab-div`,
   *         namespace: "xul",
   *         // This is important! Don't create content for multiple times
   *         ignoreIfExists: true,
   *         subElementOptions: [
   *           {
   *             tag: "h2",
   *             directAttributes: {
   *               innerText: "Hello World!",
   *             },
   *           },
   *           {
   *             tag: "label",
   *             namespace: "xul",
   *             directAttributes: {
   *               value: "This is a reader tab.",
   *             },
   *           },
   *           {
   *             tag: "label",
   *             namespace: "xul",
   *             directAttributes: {
   *               value: `Reader: ${reader._title.slice(0, 20)}`,
   *             },
   *           },
   *           {
   *             tag: "label",
   *             namespace: "xul",
   *             directAttributes: {
   *               value: `itemID: ${reader.itemID}.`,
   *             },
   *           },
   *           {
   *             tag: "button",
   *             directAttributes: {
   *               innerText: "Unregister",
   *             },
   *             listeners: [
   *               {
   *                 type: "click",
   *                 listener: () => {
   *                   this._Addon.toolkit.UI.unregisterReaderTabPanel(
   *                     readerTabId
   *                   );
   *                 },
   *               },
   *             ],
   *           },
   *         ],
   *       }
   *     );
   *     panel.append(elem);
   *   },
   *   {
   *     tabId: readerTabId,
   *   }
   * );
   * ```
   */
  async registerReaderTabPanel(
    tabLabel: string,
    renderPanelHook: (
      panel: XUL.TabPanel | undefined,
      ownerDeck: XUL.Deck,
      ownerWindow: Window,
      readerInstance: _ZoteroReaderInstance
    ) => void,
    options?: {
      tabId?: string;
      panelId?: string;
      targetIndex?: number;
      selectPanel?: boolean;
    }
  ) {
    options = options || {
      tabId: undefined,
      panelId: undefined,
      targetIndex: -1,
      selectPanel: false,
    };
    if (typeof this.readerTabCache.initializeLock === "undefined") {
      await this.initializeReaderTabObserver();
    }
    await this.readerTabCache.initializeLock.promise;
    const randomId = `${Zotero.Utilities.randomString()}-${new Date().getTime()}`;
    const tabId = options.tabId || `toolkit-readertab-${randomId}`;
    const panelId = options.panelId || `toolkit-readertabpanel-${randomId}`;
    const targetIndex =
      typeof options.targetIndex === "number" ? options.targetIndex : -1;
    this.readerTabCache.optionsList.push({
      tabId,
      tabLabel,
      panelId,
      renderPanelHook,
      targetIndex,
      selectPanel: options.selectPanel,
    });
    // Try to add tabpanel to current reader immediately
    await this.addReaderTabPanel();
    return tabId;
  }

  /**
   * Unregister the reader tabpanel.
   * @param tabId tab id
   */
  unregisterReaderTabPanel(tabId: string) {
    const idx = this.readerTabCache.optionsList.findIndex(
      (v) => v.tabId === tabId
    );
    if (idx >= 0) {
      this.readerTabCache.optionsList.splice(idx, 1);
    }
    if (this.readerTabCache.optionsList.length === 0) {
      this.readerTabCache.observer.disconnect();
      this.readerTabCache = {
        optionsList: [],
        observer: undefined,
        readerTool: new ZoteroReaderTool(),
        initializeLock: undefined,
      };
    }
    this.removeTabPanel(tabId);
  }

  private removeTabPanel(tabId: string) {
    const doc = getGlobal("document");
    Array.prototype.forEach.call(
      doc.querySelectorAll(`.toolkit-ui-tabs-${tabId}`),
      (e: XUL.Tab) => {
        e.remove();
      }
    );
  }

  private async initializeReaderTabObserver() {
    this.readerTabCache.initializeLock = getGlobal("Zotero").Promise.defer();
    await Promise.all([
      Zotero.initializationPromise,
      Zotero.unlockPromise,
      Zotero.uiReadyPromise,
    ]);
    const observer =
      this.readerTabCache.readerTool.addReaderTabPanelDeckObserver(() => {
        this.addReaderTabPanel();
      });
    this.readerTabCache.observer = observer;
    this.readerTabCache.initializeLock.resolve();
  }

  private async addReaderTabPanel() {
    const window = getGlobal("window");
    const deck = this.readerTabCache.readerTool.getReaderTabPanelDeck();
    const tabbox = deck.selectedPanel?.querySelector("tabbox") as
      | XUL.TabBox
      | undefined;
    if (!tabbox) {
      return;
    }
    const reader = await this.readerTabCache.readerTool.getReader();
    if (!reader) {
      return;
    }
    this.readerTabCache.optionsList.forEach((options) => {
      if (tabbox) {
        const tab = this.creatElementsFromJSON(window.document, {
          tag: "tab",
          namespace: "xul",
          id: `${options.tabId}-${reader._instanceID}`,
          classList: [`toolkit-ui-tabs-${options.tabId}`],
          attributes: {
            label: options.tabLabel,
          },
          ignoreIfExists: true,
        }) as XUL.Tab;
        const tabpanel = this.creatElementsFromJSON(window.document, {
          tag: "tabpanel",
          namespace: "xul",
          id: `${options.panelId}-${reader._instanceID}`,
          classList: [`toolkit-ui-tabs-${options.tabId}`],
          ignoreIfExists: true,
        }) as XUL.TabPanel;
        const tabs = tabbox.querySelector("tabs");
        const tabpanels = tabbox.querySelector("tabpanels");
        if (options.targetIndex >= 0) {
          tabs.querySelectorAll("tab")[options.targetIndex].before(tab);
          tabpanels
            .querySelectorAll("tabpanel")
            [options.targetIndex].before(tabpanel);
        } else {
          tabs.appendChild(tab);
          tabpanels.appendChild(tabpanel);
        }
        if (options.selectPanel) {
          tabbox.selectedTab = tab;
        }
        options.renderPanelHook(tabpanel, deck, window, reader);
      } else {
        options.renderPanelHook(undefined, deck, window, reader);
      }
    });
  }
}

enum MenuSelector {
  menuFile = "#menu_FilePopup",
  menuEdit = "#menu_EditPopup",
  menuView = "#menu_viewPopup",
  menuGo = "#menu_goPopup",
  menuTools = "#menu_ToolsPopup",
  menuHelp = "#menu_HelpPopup",
  collection = "#zotero-collectionmenu",
  item = "#zotero-itemmenu",
}
