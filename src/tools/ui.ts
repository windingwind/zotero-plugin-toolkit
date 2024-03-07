import { BasicOptions, BasicTool } from "../basic";

/**
 * UI APIs. Create elements and manage them.
 */
export class UITool extends BasicTool {
  /**
   * UITool options
   */
  protected _basicOptions!: UIOptions;

  public get basicOptions(): UIOptions {
    return this._basicOptions;
  }
  /**
   * Store elements created with this instance
   *
   * @remarks
   * > What is this for?
   *
   * In bootstrap plugins, elements must be manually maintained and removed on exiting.
   *
   * This API does this for you.
   */
  protected elementCache: WeakRef<Element>[];

  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.elementCache = [];
    if (!this._basicOptions.ui) {
      this._basicOptions.ui = {
        enableElementRecord: true,
        enableElementJSONLog: false,
        enableElementDOMLog: true,
      };
    }
  }

  /**
   * Remove all elements created by `createElement`.
   *
   * @remarks
   * > What is this for?
   *
   * In bootstrap plugins, elements must be manually maintained and removed on exiting.
   *
   * This API does this for you.
   */
  unregisterAll(): void {
    this.elementCache.forEach((e) => {
      try {
        e?.deref()?.remove();
      } catch (e) {
        this.log(e);
      }
    });
  }

  /**
   * Create `DocumentFragment`.
   * @param doc
   * @param tagName
   * @param props
   * @example
   * ```ts
   * const frag: DocumentFragment = ui.createElement(
   *   document, "fragment",
   *   {
   *     children:
   *     [
   *       { tag: "h1", properties: { innerText: "Hello World!" } }
   *     ]
   *   }
   * );
   * ```
   */
  createElement(
    doc: Document,
    tagName: "fragment",
    props?: FragmentElementProps
  ): DocumentFragment;
  /**
   * Create `HTMLElement`.
   * @param doc
   * @param tagName
   * @param props See {@link ElementProps }
   * @example
   * ```ts
   * const div: HTMLDivElement = ui.createElement(document, "div");
   * ```
   * @example
   * Attributes(for `elem.setAttribute()`), properties(for `elem.prop=`), listeners, and children.
   * ```ts
   * const div: HTMLDivElement = ui.createElement(
   *   document, "div",
   *   {
   *     id: "hi-div",
   *     skipIfExists: true,
   *     listeners:
   *     [
   *       { type: "click", listener: (e)=>ui.log("Clicked!") }
   *     ],
   *     children:
   *     [
   *       { tag: "h1", properties: { innerText: "Hello World!" } },
   *       { tag: "a", attributes: { href: "https://www.zotero.org" } },
   *     ]
   *   }
   * );
   * ```
   */
  createElement<
    HTML_TAG extends keyof HTMLElementTagNameMap,
    T extends HTMLElementTagNameMap[HTML_TAG]
  >(doc: Document, tagName: HTML_TAG, props?: HTMLElementProps): T;
  /**
   * Create `XUL.Element`.
   * @see ElementProps
   * @param doc
   * @param tagName
   * @param props See {@link ElementProps }
   * @example
   * ```ts
   * const menuitem: XUL.MenuItem = ui.createElement(document, "menuitem", { attributes: { label: "Click Me!" } });
   * ```
   */
  createElement<
    XUL_TAG extends keyof XULElementTagNameMap,
    T extends XULElementTagNameMap[XUL_TAG]
  >(doc: Document, tagName: XUL_TAG, props?: XULElementProps): T;
  /**
   * Create `SVGElement`
   * @param doc
   * @param tagName
   * @param props See {@link ElementProps }
   */
  createElement<
    SVG_TAG extends keyof SVGElementTagNameMap,
    T extends SVGElementTagNameMap[SVG_TAG]
  >(doc: Document, tagName: SVG_TAG, props?: SVGElementProps): T;
  /**
   * Create Element
   * @param doc
   * @param tagName
   * @param props See {@link ElementProps }
   */
  createElement(
    doc: Document,
    tagName: string,
    props?: ElementProps
  ): HTMLElement | XUL.Element | SVGElement;
  /**
   * @deprecated
   * @param doc target document, e.g. Zotero main window.document
   * @param tagName element tag name, e.g. `hbox`, `div`
   * @param namespace default "html"
   * @param enableElementRecord If current element will be recorded and maintained by toolkit. If not set, use this.enableElementRecordGlobal
   */
  createElement(
    doc: Document,
    tagName: string,
    namespace?: "html" | "svg" | "xul",
    enableElementRecord?: boolean
  ): HTMLElement | XUL.Element | SVGElement | DocumentFragment;
  createElement(...args: any[]) {
    const doc = args[0] as Document;
    const tagName = args[1].toLowerCase() as string;
    let props: ElementProps = args[2] || {};
    if (!tagName) {
      return;
    }
    // string, use the old create
    if (typeof args[2] === "string") {
      props = {
        namespace: args[2] as "html" | "xul" | "svg",
        enableElementRecord: args[3],
      };
    }

    if (
      (typeof props.enableElementJSONLog !== "undefined" &&
        props.enableElementJSONLog) ||
      this.basicOptions.ui.enableElementJSONLog
    ) {
      this.log(props);
    }
    //
    props.properties = props.properties || props.directAttributes;
    props.children = props.children || props.subElementOptions;

    let elem: HTMLElement | DocumentFragment | SVGElement | XUL.Element;
    if (tagName === "fragment") {
      const fragElem = doc.createDocumentFragment();
      elem = fragElem;
    } else {
      let realElem = (props.id &&
        (props.checkExistenceParent
          ? props.checkExistenceParent
          : doc
        ).querySelector(`#${props.id}`)) as
        | HTMLElement
        | SVGElement
        | XUL.Element
        | undefined;
      if (realElem && props.ignoreIfExists) {
        return realElem;
      }
      if (realElem && props.removeIfExists) {
        realElem.remove();
        realElem = undefined;
      }
      if (props.customCheck && !props.customCheck(doc, props)) {
        return undefined;
      }
      if (!realElem || !props.skipIfExists) {
        let namespace = props.namespace as "html" | "xul" | "svg";
        if (!namespace) {
          const mightHTML = HTMLElementTagNames.includes(tagName);
          const mightXUL = XULElementTagNames.includes(tagName);
          const mightSVG = SVGElementTagNames.includes(tagName);
          if (Number(mightHTML) + Number(mightXUL) + Number(mightSVG) > 1) {
            this.log(
              `[Warning] Creating element ${tagName} with no namespace specified. Found multiply namespace matches.`
            );
          }
          if (mightHTML) {
            namespace = "html";
          } else if (mightXUL) {
            namespace = "xul";
          } else if (mightSVG) {
            namespace = "svg";
          } else {
            namespace = "html";
          }
        }

        if (namespace === "xul") {
          realElem = this.createXULElement(doc, tagName) as XUL.Element;
        } else {
          realElem = doc.createElementNS(
            {
              html: "http://www.w3.org/1999/xhtml",
              svg: "http://www.w3.org/2000/svg",
            }[namespace],
            tagName
          ) as HTMLElement | SVGElement;
        }
        if (props.enableElementRecord) {
          this.elementCache.push(new WeakRef(realElem));
        }
      }

      if (props.id) {
        realElem.id = props.id;
      }
      if (props.styles && Object.keys(props.styles).length) {
        Object.keys(props.styles).forEach((k) => {
          const v: any = props.styles![k as keyof CSSStyleDeclaration];
          typeof v !== "undefined" && (realElem!.style[k as any] = v);
        });
      }
      if (props.properties && Object.keys(props.properties).length) {
        Object.keys(props.properties).forEach((k) => {
          const v = props.properties![k];
          typeof v !== "undefined" && ((realElem as any)[k] = v);
        });
      }
      if (props.attributes && Object.keys(props.attributes).length) {
        Object.keys(props.attributes).forEach((k) => {
          const v = props.attributes![k];
          typeof v !== "undefined" && realElem!.setAttribute(k, String(v));
        });
      }
      // Add classes after attributes, as user may set the class attribute
      if (props.classList?.length) {
        realElem.classList.add(...props.classList);
      }
      if (props.listeners?.length) {
        props.listeners.forEach(({ type, listener, options }) => {
          listener && realElem!.addEventListener(type, listener, options);
        });
      }
      elem = realElem;
    }

    if (props.children?.length) {
      const subElements = props.children
        .map((childProps) => {
          childProps.namespace = childProps.namespace || props.namespace;
          return this.createElement(doc, childProps.tag, childProps);
        })
        .filter((e) => e);
      elem.append(...subElements);
    }
    if (
      typeof props.enableElementDOMLog !== "undefined"
        ? props.enableElementDOMLog
        : this.basicOptions.ui.enableElementDOMLog
    ) {
      this.log(elem);
    }
    return elem;
  }

  /**
   * Append element(s) to a node.
   * @param properties See {@link ElementProps}
   * @param container The parent node to append to.
   * @returns A Node that is the appended child (aChild),
   *          except when aChild is a DocumentFragment,
   *          in which case the empty DocumentFragment is returned.
   */
  appendElement(properties: TagElementProps, container: Element) {
    return container.appendChild(
      this.createElement(container.ownerDocument, properties.tag, properties)
    );
  }

  /**
   * Inserts a node before a reference node as a child of its parent node.
   * @param properties See {@link ElementProps}
   * @param referenceNode The node before which newNode is inserted.
   * @returns
   */
  insertElementBefore(properties: TagElementProps, referenceNode: Element) {
    if (referenceNode.parentNode)
      return referenceNode.parentNode.insertBefore(
        this.createElement(
          referenceNode.ownerDocument,
          properties.tag,
          properties
        ),
        referenceNode
      );
    else
      this.log(
        referenceNode.tagName +
          " has no parent, cannot insert " +
          properties.tag
      );
  }

  /**
   * Replace oldNode with a new one.
   * @param properties See {@link ElementProps}
   * @param oldNode The child to be replaced.
   * @returns The replaced Node. This is the same node as oldChild.
   */
  replaceElement(properties: ElementProps & { tag: string }, oldNode: Element) {
    if (oldNode.parentNode)
      return oldNode.parentNode.replaceChild(
        this.createElement(oldNode.ownerDocument, properties.tag, properties),
        oldNode
      );
    else
      this.log(
        oldNode.tagName +
          " has no parent, cannot replace it with " +
          properties.tag
      );
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
    /* cspell:words xulns htmlns */
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
    range.selectNodeContents(doc.querySelector("div")!);
    return range.extractContents();
  }
}

export interface UIOptions extends BasicOptions {
  ui: {
    /**
     * Whether to record elements created with `createElement`.
     */
    enableElementRecord: boolean;
    /**
     * Wether to log the `ElementProps` parameter in `createElement`.
     */
    enableElementJSONLog: boolean;
    /**
     * Wether to log the DOM node mounted by `createElement`.
     */
    enableElementDOMLog: boolean;
  };
}

/**
 * `props` of `UITool.createElement`. See {@link UITool}
 */
export interface ElementProps {
  /**
   * tagName
   */
  tag?: string;
  /**
   * id
   */
  id?: string;
  /**
   * xul | html | svg
   */
  namespace?: string;
  /**
   * classList
   */
  classList?: Array<string>;
  /**
   * styles
   */
  styles?: Partial<CSSStyleDeclaration>;
  /**
   * Set with `elem.prop =`
   */
  properties?: { [key: string]: unknown };
  /**
   * @deprecated Use `properties`
   */
  directAttributes?: {
    [key: string]: string | boolean | number | null | undefined;
  };
  /**
   * Set with `elem.setAttribute()`
   */
  attributes?: { [key: string]: string | boolean | number | null | undefined };
  /**
   * Event listeners
   *  */
  listeners?: Array<{
    type: string;
    listener:
      | EventListenerOrEventListenerObject
      | ((e: Event) => void)
      | null
      | undefined;
    options?: boolean | AddEventListenerOptions;
  }>;
  /**
   * Child elements. Will be created and appended to this element.
   */
  children?: Array<TagElementProps>;
  /**
   * Set true to check if the element exists using `id`. If exists, return this element and do not do anything.
   */
  ignoreIfExists?: boolean;
  /**
   * Set true to check if the element exists using `id`. If exists, skip element creation and continue with props/attrs/children.
   */
  skipIfExists?: boolean;
  /**
   * Set true to check if the element exists using `id`. If exists, remove and re-create it, then continue with props/attrs/children.
   */
  removeIfExists?: boolean;
  /**
   * Existence check will be processed under this element, default `document`
   */
  checkExistenceParent?: HTMLElement;
  /**
   * Custom check hook. If it returns false, return undefined and do not do anything.
   * @param doc
   * @param options
   */
  customCheck?: (doc: Document, options: ElementProps) => boolean;
  /**
   * @deprecated Use `children`
   */
  subElementOptions?: Array<TagElementProps>;
  /**
   * Enable elements to be recorded by the toolkit so it can be removed when calling `unregisterAll`.
   */
  enableElementRecord?: boolean;
  /**
   * Enable elements to be printed to console & Zotero.debug.
   */
  enableElementJSONLog?: boolean;
  /**
   * Enable elements to be printed to console & Zotero.debug.
   */
  enableElementDOMLog?: boolean;
}

export interface TagElementProps extends ElementProps {
  tag: string;
}

export interface HTMLElementProps extends Exclude<ElementProps, { tag: any }> {
  namespace?: "html";
}

interface SVGElementProps extends Exclude<ElementProps, { tag: any }> {
  namespace?: "svg";
}

export interface XULElementProps extends Exclude<ElementProps, { tag: any }> {
  namespace?: "xul";
}

export interface FragmentElementProps {
  children?: Array<ElementProps>;
}

/* cspell:disable */
interface XULElementTagNameMap {
  action: XUL.Element;
  arrowscrollbox: XUL.Element;
  bbox: XUL.Element;
  binding: XUL.Element;
  bindings: XUL.Element;
  box: XUL.Box;
  broadcaster: XUL.Element;
  broadcasterset: XUL.Element;
  button: XUL.Button;
  browser: XUL.Element;
  checkbox: XUL.Checkbox;
  caption: XUL.Element;
  colorpicker: XUL.Element;
  column: XUL.Element;
  columns: XUL.Element;
  commandset: XUL.Element;
  command: XUL.Command;
  conditions: XUL.Element;
  content: XUL.Element;
  deck: XUL.Deck;
  description: XUL.Description;
  dialog: XUL.Element;
  dialogheader: XUL.Element;
  editor: XUL.Element;
  grid: XUL.Element;
  grippy: XUL.Grippy;
  groupbox: XUL.GroupBox;
  hbox: XUL.Box;
  iframe: XUL.Element;
  image: XUL.Element;
  key: XUL.Element;
  keyset: XUL.Element;
  label: XUL.Label;
  listbox: XUL.Element;
  listcell: XUL.Element;
  listcol: XUL.Element;
  listcols: XUL.Element;
  listhead: XUL.Element;
  listheader: XUL.Element;
  listitem: XUL.ListItem;
  member: XUL.Element;
  menu: XUL.Menu;
  menubar: XUL.MenuBar;
  menuitem: XUL.MenuItem;
  menulist: XUL.MenuList;
  menupopup: XUL.MenuPopup;
  menuseparator: XUL.MenuSeparator;
  observes: XUL.Element;
  overlay: XUL.Element;
  page: XUL.Element;
  popup: XUL.Popup;
  popupset: XUL.Element;
  preference: XUL.Element;
  preferences: XUL.Element;
  prefpane: XUL.Element;
  prefwindow: XUL.Element;
  progressmeter: XUL.Element;
  radio: XUL.Radio;
  radiogroup: XUL.RadioGroup;
  resizer: XUL.Element;
  richlistbox: XUL.Element;
  richlistitem: XUL.Element;
  row: XUL.Element;
  rows: XUL.Element;
  rule: XUL.Element;
  script: XUL.Element;
  scrollbar: XUL.ScrollBar;
  scrollbox: XUL.Element;
  scrollcorner: XUL.Element;
  separator: XUL.Separator;
  spacer: XUL.Spacer;
  splitter: XUL.Splitter;
  stack: XUL.Element;
  statusbar: XUL.StatusBar;
  statusbarpanel: XUL.StatusBarPanel;
  stringbundle: XUL.Element;
  stringbundleset: XUL.Element;
  tab: XUL.Tab;
  tabbrowser: XUL.Element;
  tabbox: XUL.TabBox;
  tabpanel: XUL.TabPanel;
  tabpanels: XUL.TabPanels;
  tabs: XUL.Tabs;
  template: XUL.Element;
  textnode: XUL.Element;
  textbox: XUL.Textbox;
  titlebar: XUL.Element;
  toolbar: XUL.ToolBar;
  toolbarbutton: XUL.ToolBarButton;
  toolbargrippy: XUL.ToolBarGrippy;
  toolbaritem: XUL.ToolBarItem;
  toolbarpalette: XUL.ToolBarPalette;
  toolbarseparator: XUL.ToolBarSeparator;
  toolbarset: XUL.ToolBarSet;
  toolbarspacer: XUL.ToolBarSpacer;
  toolbarspring: XUL.ToolBarSpring;
  toolbox: XUL.ToolBox;
  tooltip: XUL.Tooltip;
  tree: XUL.Tree;
  treecell: XUL.TreeCell;
  treechildren: XUL.TreeChildren;
  treecol: XUL.TreeCol;
  treecols: XUL.TreeCols;
  treeitem: XUL.TreeItem;
  treerow: XUL.TreeRow;
  treeseparator: XUL.TreeSeparator;
  triple: XUL.Element;
  vbox: XUL.Box;
  window: XUL.Element;
  wizard: XUL.Element;
  wizardpage: XUL.Element;
}

const HTMLElementTagNames = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
];

const XULElementTagNames = [
  "action",
  "arrowscrollbox",
  "bbox",
  "binding",
  "bindings",
  "box",
  "broadcaster",
  "broadcasterset",
  "button",
  "browser",
  "checkbox",
  "caption",
  "colorpicker",
  "column",
  "columns",
  "commandset",
  "command",
  "conditions",
  "content",
  "deck",
  "description",
  "dialog",
  "dialogheader",
  "editor",
  "grid",
  "grippy",
  "groupbox",
  "hbox",
  "iframe",
  "image",
  "key",
  "keyset",
  "label",
  "listbox",
  "listcell",
  "listcol",
  "listcols",
  "listhead",
  "listheader",
  "listitem",
  "member",
  "menu",
  "menubar",
  "menuitem",
  "menulist",
  "menupopup",
  "menuseparator",
  "observes",
  "overlay",
  "page",
  "popup",
  "popupset",
  "preference",
  "preferences",
  "prefpane",
  "prefwindow",
  "progressmeter",
  "radio",
  "radiogroup",
  "resizer",
  "richlistbox",
  "richlistitem",
  "row",
  "rows",
  "rule",
  "script",
  "scrollbar",
  "scrollbox",
  "scrollcorner",
  "separator",
  "spacer",
  "splitter",
  "stack",
  "statusbar",
  "statusbarpanel",
  "stringbundle",
  "stringbundleset",
  "tab",
  "tabbrowser",
  "tabbox",
  "tabpanel",
  "tabpanels",
  "tabs",
  "template",
  "textnode",
  "textbox",
  "titlebar",
  "toolbar",
  "toolbarbutton",
  "toolbargrippy",
  "toolbaritem",
  "toolbarpalette",
  "toolbarseparator",
  "toolbarset",
  "toolbarspacer",
  "toolbarspring",
  "toolbox",
  "tooltip",
  "tree",
  "treecell",
  "treechildren",
  "treecol",
  "treecols",
  "treeitem",
  "treerow",
  "treeseparator",
  "triple",
  "vbox",
  "window",
  "wizard",
  "wizardpage",
];

const SVGElementTagNames = [
  "a",
  "animate",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "script",
  "set",
  "stop",
  "style",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  "title",
  "tspan",
  "use",
  "view",
];

/* cspell:enable */
