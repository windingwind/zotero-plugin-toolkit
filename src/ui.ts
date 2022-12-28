import { ElementOptions, MenuitemOptions } from "./options";
import { createXULElement, log, getZotero } from "./utils";

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
  constructor() {
    this.addonElements = [];
    this.enableElementRecordGlobal = true;
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
        return undefined;
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
   * // base64 or chrome:// url
   * const menuIcon = "chrome://addontemplate/content/icons/favicon@0.5x.png";
   * this._Addon.Utils.UI.insertMenuItem("item", {
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
   * this._Addon.Utils.UI.insertMenuItem(
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
   *   this._Addon.Zotero.getMainWindow().document.querySelector(
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
    const Zotero = getZotero();
    let popup: XUL.MenuPopup;
    if (typeof menuPopup === "string") {
      popup = (Zotero.getMainWindow() as Window).document.querySelector(
        MenuSelector[menuPopup]
      );
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
