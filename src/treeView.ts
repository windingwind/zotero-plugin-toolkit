import { ZoteroTool } from "./tool";
import { getZotero } from "./utils";

/**
 * Tool for adding customized new columns to the library treeView
 */
export class ItemTreeTool {
  /**
   * Signature to avoid patching more than once.
   */
  private patchSign: string;
  /**
   * A ZoteroTool instance.
   */
  private tool: ZoteroTool;
  private Zotero: _ZoteroConstructable;
  private initializationLock: _ZoteroPromiseObject;
  /**
   * Initialize Zotero._ItemTreeExtraColumnsGlobal if it doesn't exist.
   *
   * New columns and hooks are stored there.
   *
   * Then patch `require("zotero/itemTree").getColumns` and `Zotero.Item.getField`
   */
  constructor() {
    this.patchSign = "zotero-plugin-toolkit@0.0.1";
    this.tool = new ZoteroTool();
    this.Zotero = getZotero();
    this.initializationLock = this.Zotero.Promise.defer();

    this.initializeGlobal();
  }

  /**
   * Do initializations. Called in constructor to be async
   */
  private async initializeGlobal() {
    await this.Zotero.uiReadyPromise;
    const window = this.Zotero.getMainWindow();
    if (!this.Zotero._ItemTreeExtraColumnsGlobal) {
      this.Zotero._ItemTreeExtraColumnsGlobal = {
        columns: [],
        fieldHooks: {},
      };
      const itemTree = window.require("zotero/itemTree");
      this.tool.patch(
        itemTree.prototype,
        "getColumns",
        this.patchSign,
        (original) =>
          function () {
            // @ts-ignore
            const columns: Column[] = original.apply(this, arguments);
            const insertAfter = columns.findIndex(
              (column) => column.dataKey === "title"
            );
            columns.splice(
              insertAfter + 1,
              0,
              ...Zotero._ItemTreeExtraColumnsGlobal.columns
            );
            return columns;
          }
      );
      // TODO: Customize cell content. Finish this part later.
      // this.patch(
      //   itemTree.prototype,
      //   "_renderCell",
      //   this.toolkitSign,
      //   (original) =>
      //     function (index: number, data: string, column: Column) {
      //       console.log("_renderCell");
      //       if (
      //         !this.Zotero._ItemTreeExtraColumnsGlobal.columns
      //           .map((_c: Column) => _c.dataKey)
      //           .includes(column.dataKey)
      //       ) {
      //         // @ts-ignore
      //         return original.apply(this, arguments);
      //       }
      //       const span = document.createElementNS(
      //         "http://www.w3.org/1999/xhtml",
      //         "span"
      //       );
      //       span.className = `cell ${column.className}`;

      //       let contentElement;
      //       const idx = (this.Zotero._ItemTreeExtraColumnsGlobal.columns as Column[])
      //         .map((_c) => _c.dataKey)
      //         .indexOf(column.dataKey);
      //       const hook = this.Zotero._ItemTreeExtraColumnsGlobal.columns[idx].renderHook;
      //       if (hook) {
      //         try {
      //           // @ts-ignore
      //           contentElement = hook(index, data, column, this);
      //         } catch (e) {
      //           contentElement = document.createElementNS(
      //             "http://www.w3.org/1999/xhtml",
      //             "span"
      //           );
      //           contentElement.className =
      //             "zotero-items-column-loading icon icon-bg cell-icon";
      //         }
      //       } else {
      //         contentElement = document.createElementNS(
      //           "http://www.w3.org/1999/xhtml",
      //           "span"
      //         );
      //         contentElement.className = "cell-text";
      //         contentElement.innerText = data;
      //       }
      //       span.append(contentElement);
      //       return span;
      //     }
      // );
      this.tool.patch(
        this.Zotero.Item.prototype,
        "getField",
        this.patchSign,
        (original) =>
          function (
            field: string,
            unformatted: boolean,
            includeBaseMapped: boolean
          ) {
            if (
              Zotero._ItemTreeExtraColumnsGlobal.columns
                .map((_c: Column) => _c.dataKey)
                .includes(field)
            ) {
              try {
                const hook =
                  Zotero._ItemTreeExtraColumnsGlobal.fieldHooks[field];
                // @ts-ignore
                return hook(field, unformatted, includeBaseMapped, this);
              } catch (e) {
                return field + String(e);
              }
            }
            // @ts-ignore
            return original.apply(this, arguments);
          }
      );
    }
    this.initializationLock.resolve();
  }

  /**
   * @alpha
   * @param doc
   * @param text
   */
  private makeTextCell(doc: Document, text: string) {
    const textSpan = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "span"
    );
    textSpan.className = "cell-text";
    textSpan.innerText = text;
    return textSpan;
  }

  /**
   * @alpha
   * @param doc
   */
  private makeLoadingIconCell(doc: Document) {
    const loadingIcon = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "span"
    );
    loadingIcon.className =
      "zotero-items-column-loading icon icon-bg cell-icon";
    return loadingIcon;
  }

  /**
   * Create a React Icon element
   * @param props
   */
  private createIconLabel(props: {
    iconPath: string;
    name: string;
  }): ReactElement {
    // @ts-ignore
    const react = window.require("react");
    return react.createElement(
      "span",
      null,
      react.createElement("img", {
        src: props.iconPath,
        height: "10px",
        width: "9px",
        style: {
          "margin-left": "6px",
        },
      }),
      " ",
      props.name
    );
  }

  /**
   * An example of registering an extra column
   */
  async registerExample() {
    await this.register(
      "test",
      "new column",
      (
        field: string,
        unformatted: boolean,
        includeBaseMapped: boolean,
        item: Zotero.Item
      ) => {
        return field + String(item.id);
      },
      {
        iconPath: "chrome://zotero/skin/cross.png",
      }
    );
    this.tool.log(
      "You are calling an example code. Don't forget to run unregister('test').",
      String(this.registerExample)
    );
  }

  /**
   * Register a new column. Don't forget to call `unregister` on plugin exit.
   * @param key Column dataKey
   * @param label Column display label
   * @param fieldHook Called when rendering cell content
   * @param options See zotero source code:chrome/content/zotero/itemTreeColumns.jsx
   */
  async register(
    key: string,
    label: string,
    fieldHook: (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item
    ) => string,
    options: {
      defaultIn?: Set<"default" | "feeds" | "feed" | string>;
      disabledIn?: Set<"default" | "feeds" | "feed" | string>;
      defaultSort?: 1 | -1;
      flex?: number;
      width?: string;
      fixedWidth?: boolean;
      staticWidth?: boolean;
      minWidth?: number;
      iconPath?: string;
      ignoreInColumnPicker?: boolean;
      submenu?: boolean;
      zoteroPersist?: Set<string>;
    }
  ) {
    await this.initializationLock.promise;
    if (
      this.Zotero._ItemTreeExtraColumnsGlobal.columns
        .map((_c: Column) => _c.dataKey)
        .includes(key)
    ) {
      this.tool.log(`ItemTreeTool: ${key} is already registered.`);
      return;
    }
    const column: Column = {
      dataKey: key,
      label: label,
      iconLabel: options.iconPath
        ? this.createIconLabel({
            iconPath: options.iconPath,
            name: label,
          })
        : undefined,
      zoteroPersist:
        options.zoteroPersist ||
        new Set(["width", "ordinal", "hidden", "sortActive", "sortDirection"]),
      defaultIn: options.defaultIn,
      disabledIn: options.disabledIn,
      defaultSort: options.defaultSort,
      flex: typeof options.flex === "undefined" ? 1 : options.flex,
      width: options.width,
      fixedWidth: options.fixedWidth,
      staticWidth: options.staticWidth,
      minWidth: options.minWidth,
      ignoreInColumnPicker: options.ignoreInColumnPicker,
      submenu: options.submenu,
    };
    if (fieldHook) {
      this.Zotero._ItemTreeExtraColumnsGlobal.fieldHooks[key] = fieldHook;
    }
    this.Zotero._ItemTreeExtraColumnsGlobal.columns.push(column);
    await this.refresh();
  }

  /**
   * Unregister an extra column. Call it on plugin exit.
   * @param key Column dataKey, should be same as the one used in `register`
   */
  async unregister(key: string) {
    await this.initializationLock.promise;
    let persisted = this.Zotero.Prefs.get("pane.persist") as string;

    const persistedJSON = JSON.parse(persisted) as { [key: string]: any };
    delete persistedJSON[key];
    this.Zotero.Prefs.set("pane.persist", JSON.stringify(persistedJSON));

    const idx = (this.Zotero._ItemTreeExtraColumnsGlobal.columns as Column[])
      .map((_c) => _c.dataKey)
      .indexOf(key);
    if (idx >= 0) {
      this.Zotero._ItemTreeExtraColumnsGlobal.columns.splice(idx, 1);
    }
    delete this.Zotero._ItemTreeExtraColumnsGlobal.fieldHooks[key];
    await this.refresh();
  }

  /**
   * Refresh itemView. You don't need to call it manually.
   */
  private async refresh() {
    await this.initializationLock.promise;
    const ZoteroPane = this.Zotero.getActiveZoteroPane();
    ZoteroPane.itemsView._columnsId = null;
    // Remove style list otherwise the change will not be updated
    document
      .querySelector(`.${ZoteroPane.itemsView.tree._columns._styleKey}`)
      ?.remove();
    // Refresh to rebuild _columns
    await ZoteroPane.itemsView.refreshAndMaintainSelection();
    // Construct a new virtualized-table, otherwise it will not be updated
    ZoteroPane.itemsView.tree._columns =
      new ZoteroPane.itemsView.tree._columns.__proto__.constructor(
        ZoteroPane.itemsView.tree
      );
    // Refresh again to totally make the itemView updated
    await ZoteroPane.itemsView.refreshAndMaintainSelection();
  }
}

interface Column {
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

declare interface ReactElement {
  [key: string | number | symbol]: any;
}
