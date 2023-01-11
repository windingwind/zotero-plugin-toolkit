import { BasicOptions, BasicTool } from "../basic";

/**
 * UI APIs. Create elements and manage them.
 */
export class UITool extends BasicTool {
  /**
   * Element management options
   * @remarks
   * > What is this for?
   *
   * In boostrap plugins, elements must be manually maintained and removed on exiting.
   *
   * If this is `false`, newly created elements with `createElement` will not be maintained.
   */
  public elementOptions: {
    /**
     * If elements created with `createElement` should be recorded.
     */
    enableElementRecord: boolean;
    /**
     * If the input of `createElementFromJSON` should be logged.
     */
    enableElementJSONLog: boolean;
  };
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
  private elementCache: Element[];

  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.elementCache = [];
    this.elementOptions = {
      enableElementRecord: true,
      enableElementJSONLog: true,
    };
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
  unregisterAll(): void {
    this.removeElements();
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
      elem = this.createXULElement(doc, tagName);
    } else {
      elem = doc.createElementNS(namespaces[namespace], tagName) as
        | HTMLElement
        | SVGElement;
    }
    if (
      (typeof enableElementRecord !== "undefined" && enableElementRecord) ||
      this.elementOptions.enableElementRecord
    ) {
      this.elementCache.push(elem);
    }
    return elem;
  }

  private removeElements() {
    this.elementCache.forEach((e) => {
      try {
        e?.remove();
      } catch (e) {
        this.log(e);
      }
    });
  }
  /**
   * Create elements in batch, based on `createElement`.
   * 
   * The return element will also be maintained by toolkit.
   * @param doc 
   * @param options See {@link https://github.com/windingwind/zotero-plugin-toolkit/blob/main/src/options.ts | source code:options.ts}
   * @param options.tag tagName
   * @param options.id element id
   * @param options.namespace namespace, "html" | "svg" | "xul". Default "html".
   * subElements will inherit namespace if not assigned.
   * @param options.classList class list
   * @param options.styles styles
   * @param options.directAttributes attributes that can be directly set by`elem.attr = "value"`
   * @param options.attributes attributes set by `elem.setAttribute("key", "value")`
   * @param options.listeners event listeners
   * @param options.ignoreIfExists Skip element creation and return the existing element immediately if the target element with specific `id` exists, default `false`.
   * @param options.skipIfExists Skip element creation and continue if the target element with specific `id` exists, default `false`.
   * @param options.removeIfExists Remove element before creation if the target element with specific `id` exists, default `false`.
   * @param options.checkExistanceParent When `ignoreIfExists` or `removeIfExists` is `true`, toolkit will try to search the element with specific `id`.
   * If this element is undefined, search under `document` node; otherwise under this `checkExistanceParent` node.
   * @param options.customCheck Custom check hook. If it returns false, skip element creation and return immediately.
   * @param options.subElementOptions Child nodes options
   * @example
   * Create multiple menu item/menu. This code is part of Zotero Better Notes.
   * ```ts
   * const ui = new ZoteroUI();
   * 
   * const imageSelected = () => {
   *   // Return false to skip current element
   *   return true;
   * };
   * 
   * const popup = document.getElementById("popup")!;

   * const elementOptions = {
   *   tag: "fragment",
   *   namespace: "xul",
   *   subElementOptions: [
   *     {
   *       tag: "menuseparator",
   *       id: "menupopup-betternotessplitter",
   *       checkExistanceParent: popup,
   *       ignoreIfExists: true,
   *     },
   *     {
   *       tag: "menuitem",
   *       id: "menupopup-resizeImage",
   *       checkExistanceParent: popup,
   *       ignoreIfExists: true,
   *       attributes: { label: "Resize Image" },
   *       customCheck: imageSelected,
   *       listeners: [
   *         {
   *           type: "command",
   *           listener: (e) => {
   *             postMessage({ type: "resizeImage", width: 100 }, "   * ");
   *           },
   *         ],
   *       ],
   *     },
   *   ],
   * };
   * 
   * const fragment = ui.creatElementsFromJSON(
   *   popup.ownerDocument,
   *   elementOptions
   * );
   * if (fragment) {
   *   popup.append(fragment);
   * }
   * ```
   */
  creatElementsFromJSON(
    doc: Document,
    options: ElementOptions,
    enableElementJSONLog: boolean = undefined
  ) {
    if (
      (typeof enableElementJSONLog !== "undefined" && enableElementJSONLog) ||
      this.elementOptions.enableElementJSONLog
    )
      this.log(options);
    let element: Element | DocumentFragment | undefined =
      options.id &&
      options.tag !== "fragment" &&
      (options.checkExistanceParent
        ? options.checkExistanceParent
        : doc
      ).querySelector(`#${options.id}`);
    if (element && options.ignoreIfExists) {
      return element;
    }
    if (element && options.removeIfExists) {
      element.remove();
      element = undefined;
    }
    if (options.customCheck && !options.customCheck(doc, options)) {
      return undefined;
    }
    if (!element || !options.skipIfExists) {
      element = this.createElement(doc, options.tag, options.namespace);
    }

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
          typeof v !== "undefined" && ((element as HTMLElement).style[k] = v);
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
          typeof v !== "undefined" &&
            (element as HTMLElement).setAttribute(k, String(v));
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
        .map((_options) => {
          _options.namespace = _options.namespace || options.namespace;
          return this.creatElementsFromJSON(doc, _options);
        })
        .filter((e) => e);
      element.append(...subElements);
    }
    return element;
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
    this.log(wrappedStr, parser);
    let doc = parser.parseFromString(wrappedStr, "text/xml");
    /* eslint-enable indent */
    this.log(doc);

    if (doc.documentElement.localName === "parsererror") {
      throw new Error("not well-formed XHTML");
    }

    // We use a range here so that we don't access the inner DOM elements from
    // JavaScript before they are imported and inserted into a document.
    let range = doc.createRange();
    range.selectNodeContents(doc.querySelector("div"));
    return range.extractContents();
  }
}

export interface ElementOptions {
  tag: string;
  id?: string;
  namespace?: "html" | "svg" | "xul";
  classList?: Array<string>;
  styles?: { [key: string]: string };
  directAttributes?: { [key: string]: string | boolean | number };
  attributes?: { [key: string]: string | boolean | number };
  listeners?: Array<{
    type: string;
    listener: EventListenerOrEventListenerObject | ((e: Event) => void);
    options?: boolean | AddEventListenerOptions;
  }>;
  checkExistanceParent?: HTMLElement;
  ignoreIfExists?: boolean;
  skipIfExists?: boolean;
  removeIfExists?: boolean;
  customCheck?: (doc: Document, options: ElementOptions) => boolean;
  subElementOptions?: Array<ElementOptions>;
}
