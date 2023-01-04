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
  removeIfExists?: boolean;
  customCheck?: (doc: Document, options: ElementOptions) => boolean;
  subElementOptions?: Array<ElementOptions>;
}

export interface MenuitemOptions {
  tag: "menuitem" | "menu" | "menuseparator";
  id?: string;
  label?: string;
  // data url (chrome://xxx.png) or base64 url (data:image/png;base64,xxx)
  icon?: string;
  classList?: string[];
  class?: string;
  styles?: { [key: string]: string };
  hidden?: boolean;
  disabled?: boolean;
  oncommand?: string;
  commandListener?: EventListenerOrEventListenerObject;
  // Attributes below are used when type === "menu"
  popupId?: string;
  onpopupshowing?: string;
  subElementOptions?: Array<MenuitemOptions>;
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

export interface ReactElement {
  [key: string | number | symbol]: any;
}

export interface ColumnOptions {
  dataKey: string;
  label: string;
  iconLabel?: ReactElement;
  defaultIn?: Set<"default" | "feeds" | "feed" | string>;
  disabledIn?: Set<"default" | "feeds" | "feed" | string>;
  defaultSort?: 1 | -1;
  flex?: number;
  width?: string;
  fixedWidth?: boolean;
  staticWidth?: boolean;
  minWidth?: number;
  ignoreInColumnPicker?: boolean;
  submenu?: boolean;
  zoteroPersist?: Set<string>;
}
