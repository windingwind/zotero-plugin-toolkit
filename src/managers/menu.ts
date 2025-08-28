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
      if (menuitemOption.isHidden || menuitemOption.getVisibility) {
        popup?.addEventListener("popupshowing", async (ev: Event) => {
          let hidden: boolean | undefined;
          if (menuitemOption.isHidden) {
            hidden = await menuitemOption.isHidden(menuItem as any, ev);
          } else if (menuitemOption.getVisibility) {
            const visible = await menuitemOption.getVisibility(
              menuItem as any,
              ev,
            );
            hidden = typeof visible === "undefined" ? undefined : !visible;
          }
          if (typeof hidden === "undefined") {
            return;
          }
          if (hidden) {
            menuItem.setAttribute("hidden", "true");
          } else {
            menuItem.removeAttribute("hidden");
          }
        });
      }
      if (menuitemOption.isDisabled) {
        popup?.addEventListener("popupshowing", async (ev: Event) => {
          const disabled = await menuitemOption.isDisabled!(
            menuItem as any,
            ev,
          );
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
      if (
        (menuitemOption.tag === "menuitem" ||
          menuitemOption.tag === "menuseparator") &&
        menuitemOption.onShowing
      ) {
        popup?.addEventListener("popupshowing", async (ev: Event) => {
          await menuitemOption.onShowing!(menuItem as any, ev);
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
      /**
       * return true to show and false to hide current element
       * @deprecated Use `isHidden`.
       */
      getVisibility?: (
        elem: XUL.MenuItem,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Dynamically hide/show the menu item
       * @returns Whether the menu item should be hidden
       */
      isHidden?: (
        elem: XUL.MenuItem,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Dynamically enable/disable the menu item
       * @returns Whether the menu item should be disabled
       */
      isDisabled?: (
        elem: XUL.MenuItem,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Fired when the containing menu popup is shown
       */
      onShowing?: (elem: XUL.MenuItem, event: Event) => any | Promise<any>;
      type?: "" | "checkbox" | "radio";
      checked?: boolean;
    }
  | {
      tag: "menu";
      /**
       * return true to show and false to hide current element
       * @deprecated Use `isHidden`.
       */
      getVisibility?: (
        elem: XUL.Menu,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Dynamically hide/show the menu
       * @returns Whether the menu should be hidden
       */
      isHidden?: (
        elem: XUL.Menu,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Dynamically enable/disable the menu
       * @returns Whether the menu should be disabled
       */
      isDisabled?: (
        elem: XUL.Menu,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /* Attributes below are used when type === "menu" */
      popupId?: string;
      /**
       * Fired when the containing menu popup is shown. Consider using `onShowing` instead.
       */
      onpopupshowing?: string;
      children?: Array<MenuitemOptions>;
      /**
       * @deprecated Use `children`.
       */
      subElementOptions?: Array<MenuitemOptions>;
    }
  | {
      tag: "menuseparator";
      /**
       * return true to show and false to hide current element
       * @deprecated Use `isHidden`.
       */
      getVisibility?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Dynamically hide/show the separator
       * @returns Whether the separator should be hidden
       */
      isHidden?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Dynamically enable/disable the separator
       * @returns Whether the separator should be disabled
       */
      isDisabled?: (
        elem: XUL.MenuSeparator,
        ev: Event,
      ) => boolean | undefined | Promise<boolean | undefined>;
      /**
       * Fired when the containing menu popup is shown
       */
      onShowing?: (elem: XUL.MenuSeparator, event: Event) => any | Promise<any>;
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
