import type { BasicOptions, BasicTool } from "../basic.js";
import type { TagElementProps } from "../tools/ui.js";
import { ManagerTool } from "../basic.js";
import { UITool } from "../tools/ui.js";

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
   * // base64 or chrome:// url
   * const menuIcon = "chrome://addontemplate/content/icons/favicon@0.5x.png";
   * ztoolkit.Menu.register("item", {
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
   * ztoolkit.Menu.register(
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
    anchorElement?: XUL.Element,
  ) {
    let popup: XUL.MenuPopup | null;
    if (typeof menuPopup === "string") {
      // eslint-disable-next-line ts/no-use-before-define
      popup = this.getGlobal("document").querySelector(MenuSelector[menuPopup]);
    } else {
      popup = menuPopup;
    }
    if (!popup) {
      return false;
    }
    const doc: Document = popup.ownerDocument;
    const genMenuElement = (menuitemOption: MenuitemOptions) => {
      const elementOption: TagElementProps = {
        tag: menuitemOption.tag,
        id: menuitemOption.id,
        namespace: "xul",
        attributes: {
          label: menuitemOption.label || "",
          hidden: Boolean(menuitemOption.hidden),
          disabled: Boolean(menuitemOption.disabled),
          class: menuitemOption.class || "",
          oncommand: menuitemOption.oncommand || "",
        },
        classList: menuitemOption.classList,
        styles: menuitemOption.styles || {},
        listeners: [],
        children: [],
      };
      if (menuitemOption.icon) {
        if (!this.getGlobal("Zotero").isMac) {
          if (menuitemOption.tag === "menu") {
            elementOption.attributes!.class += " menu-iconic";
          } else {
            elementOption.attributes!.class += " menuitem-iconic";
          }
        }
        elementOption.styles!["list-style-image" as any] =
          `url(${menuitemOption.icon})`;
      }
      if (menuitemOption.commandListener) {
        elementOption.listeners?.push({
          type: "command",
          listener: menuitemOption.commandListener!,
        });
      }
      if (menuitemOption.tag === "menuitem") {
        elementOption.attributes!.type = menuitemOption.type || "";
        elementOption.attributes!.checked = menuitemOption.checked || false;
      }
      const menuItem = this.ui.createElement(
        doc,
        menuitemOption.tag,
        elementOption,
      ) as XUL.MenuItem | XUL.Menu | XUL.MenuSeparator;
      if (menuitemOption.getVisibility) {
        popup?.addEventListener("popupshowing", (ev: Event) => {
          const showing = menuitemOption.getVisibility!(menuItem as any, ev);
          if (typeof showing === "undefined") {
            return;
          }
          if (showing) {
            menuItem.removeAttribute("hidden");
          } else {
            menuItem.setAttribute("hidden", "true");
          }
        });
      }
      if (menuitemOption.isDisabled) {
        popup?.addEventListener("popupshowing", (ev: Event) => {
          const disabled = menuitemOption.isDisabled!(menuItem as any, ev);
          if (typeof disabled === "undefined") {
            return;
          }
          if (disabled) {
            menuItem.setAttribute("disabled", "true");
          } else {
            menuItem.removeAttribute("disabled");
          }
        });
      }
      if (menuitemOption.tag === "menu") {
        const subPopup = this.ui.createElement(doc, "menupopup", {
          id: menuitemOption.popupId,
          attributes: { onpopupshowing: menuitemOption.onpopupshowing || "" },
        });
        menuitemOption.children?.forEach((childOption) => {
          subPopup.append(genMenuElement(childOption));
        });
        menuItem.append(subPopup);
      }
      return menuItem;
    };
    const topMenuItem = genMenuElement(options);
    if (popup.childElementCount) {
      if (!anchorElement) {
        anchorElement = (
          insertPosition === "after"
            ? popup.lastElementChild
            : popup.firstElementChild
        ) as XUL.Element;
      }
      anchorElement[insertPosition](topMenuItem);
    } else {
      popup.appendChild(topMenuItem);
    }
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

type MenuitemTagDependentOptions =
  | {
      tag: "menuitem";
      /* return true to show and false to hide current element */
      getVisibility?: (elem: XUL.MenuItem, ev: Event) => boolean | undefined;
      /* return true to disable and false to enable current element */
      isDisabled?: (elem: XUL.MenuItem, ev: Event) => boolean | undefined;
      type?: "" | "checkbox" | "radio";
      checked?: boolean;
    }
  | {
      tag: "menu";
      /* return true to show and false to hide current element */
      getVisibility?: (elem: XUL.Menu, ev: Event) => boolean | undefined;
      /* return true to disable and false to enable current element */
      isDisabled?: (elem: XUL.Menu, ev: Event) => boolean | undefined;
      /* Attributes below are used when type === "menu" */
      popupId?: string;
      onpopupshowing?: string;
      children?: Array<MenuitemOptions>;
      /**
       * @deprecated Use `children`.
       */
      subElementOptions?: Array<MenuitemOptions>;
    }
  | {
      tag: "menuseparator";
      /* return true to show and false to hide current element */
      getVisibility?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined;
      /* return true to disable and false to enable current element */
      isDisabled?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined;
    };

interface MenuitemCommonOptions {
  id?: string;
  label?: string;
  /* data url (chrome://xxx.png) or base64 url (data:image/png;base64,xxx) */
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
}

export type MenuitemOptions = MenuitemTagDependentOptions &
  MenuitemCommonOptions;
