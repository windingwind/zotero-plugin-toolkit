import { BasicOptions, BasicTool } from "../basic";
import { ElementProps, TagElementProps, UITool } from "../tools/ui";
import { ManagerTool } from "../basic";

/**
 * Register \<menuitem\>, \<menupopup\>, or \<menuseperator\> to Zotero right-click/window menus.
 */
export class MenuManager extends ManagerTool {
  private ui: UITool;
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.ui = new UITool(this);
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
   * @param options
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
  register(
    menuPopup: XUL.MenuPopup | keyof typeof MenuSelector,
    options: MenuitemOptions,
    insertPosition: "before" | "after" = "after",
    anchorElement?: XUL.Element
  ) {
    let popup: XUL.MenuPopup | null;
    if (typeof menuPopup === "string") {
      popup = this.getGlobal("document").querySelector(MenuSelector[menuPopup]);
    } else {
      popup = menuPopup;
    }
    if (!popup) {
      return false;
    }
    const doc: Document = popup.ownerDocument;
    const generateElementOptions = (menuitemOption: MenuitemOptions) => {
      const elementOption: TagElementProps = {
        tag: menuitemOption.tag,
        id: menuitemOption.id,
        namespace: "xul",
        attributes: {
          label: menuitemOption.label || "",
          hidden: Boolean(menuitemOption.hidden),
          disaled: Boolean(menuitemOption.disabled),
          class: menuitemOption.class || "",
          oncommand: menuitemOption.oncommand || "",
        },
        classList: menuitemOption.classList,
        styles: menuitemOption.styles || {},
        listeners: [],
        children: [],
      };
      if (menuitemOption.icon) {
        elementOption.attributes!["class"] += " menuitem-iconic";
        elementOption.styles![
          "list-style-image" as any
        ] = `url(${menuitemOption.icon})`;
      }
      if (menuitemOption.tag === "menu") {
        elementOption.children!.push({
          tag: "menupopup",
          id: menuitemOption.popupId,
          attributes: { onpopupshowing: menuitemOption.onpopupshowing || "" },
          children: (
            menuitemOption.children ||
            menuitemOption.subElementOptions ||
            []
          ).map(generateElementOptions),
        });
      }
      if (menuitemOption.commandListener) {
        elementOption.listeners?.push({
          type: "command",
          listener: menuitemOption.commandListener!,
        });
      }
      return elementOption;
    };
    const props = generateElementOptions(options);
    const menuItem = this.ui.createElement(doc, options.tag, props);
    if (!anchorElement) {
      anchorElement = (
        insertPosition === "after"
          ? popup.lastElementChild
          : popup.firstElementChild
      ) as XUL.Element;
    }
    anchorElement[insertPosition](menuItem);
  }

  unregister(menuId: string) {
    this.getGlobal("document").querySelector(`#${menuId}`)?.remove();
  }

  unregisterAll(): void {
    this.ui.unregisterAll();
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
  commandListener?:
    | EventListenerOrEventListenerObject
    | ((event: Event) => any);
  // Attributes below are used when type === "menu"
  popupId?: string;
  onpopupshowing?: string;
  children?: Array<MenuitemOptions>;
  /**
   * @deprecated Use `children`.
   */
  subElementOptions?: Array<MenuitemOptions>;
}
