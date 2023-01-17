import React = require("react");
import { BasicOptions, BasicTool } from "../basic";
import { ManagerTool } from "../basic";
import ToolkitGlobal from "./toolkitGlobal";

/**
 * Register customized new columns to the library itemTree.
 */
export class ItemTreeManager extends ManagerTool {
  /**
   * Signature to avoid patching more than once.
   */
  private patchSign: string;
  private globalCache: ItemTreeExtraColumnsGlobal;
  private localColumnCache: string[];
  private localFieldCache: string[];
  private localRenderCellCache: string[];
  private initializationLock: _ZoteroTypes.PromiseObject;
  /**
   * Initialize Zotero._ItemTreeExtraColumnsGlobal if it doesn't exist.
   *
   * New columns and hooks are stored there.
   *
   * Then patch `require("zotero/itemTree").getColumns` and `Zotero.Item.getField`
   */
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.patchSign = "zotero-plugin-toolkit@0.0.1";
    this.localColumnCache = [];
    this.localFieldCache = [];
    this.localRenderCellCache = [];
    this.initializationLock = this.getGlobal("Zotero").Promise.defer();

    this.initializeGlobal();
  }

  unregisterAll(): void {
    [...this.localColumnCache].forEach(this.unregister.bind(this));
    [...this.localFieldCache].forEach(this.removeFieldHook.bind(this));
    [...this.localRenderCellCache].forEach(
      this.removeRenderCellHook.bind(this)
    );
  }

  /**
   * Register a new column. Don't forget to call `unregister` on plugin exit.
   * @param key Column dataKey
   * @param label Column display label
   * @param fieldHook Called when loading cell content
   * @param options See zotero source code:chrome/content/zotero/itemTreeColumns.jsx
   * @param options.renderCellHook Called when rendering cell. This will override
   *
   * @example
   * ```ts
   * const itemTree = new ItemTreeTool();
   * await itemTree.register(
   *   "test",
   *   "new column",
   *   (
   *     field: string,
   *     unformatted: boolean,
   *     includeBaseMapped: boolean,
   *     item: Zotero.Item
   *   ) => {
   *     return field + String(item.id);
   *   },
   *   {
   *     iconPath: "chrome://zotero/skin/cross.png",
   *   }
   * );
   * ```
   */
  public async register(
    key: string,
    label: string,
    fieldHook: (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      original: Function
    ) => string,
    options: {
      defaultIn?: Set<"default" | "feeds" | "feed" | string>;
      disabledIn?: Set<"default" | "feeds" | "feed" | string>;
      defaultSort?: 1 | -1;
      flex?: number;
      width?: number;
      fixedWidth?: boolean;
      staticWidth?: boolean;
      minWidth?: number;
      iconPath?: string;
      ignoreInColumnPicker?: boolean;
      submenu?: boolean;
      zoteroPersist?: Set<string>;
      renderCellHook?: (
        index: number,
        data: string,
        column: ColumnOptions,
        original: Function
      ) => HTMLElement;
    } = {}
  ) {
    await this.initializationLock.promise;
    if (
      this.globalCache.columns
        .map((_c: ColumnOptions) => _c.dataKey)
        .includes(key)
    ) {
      this.log(`ItemTreeTool: ${key} is already registered.`);
      return;
    }
    const column: ColumnOptions = {
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
      await this.addFieldHook(key, fieldHook);
    }
    if (options.renderCellHook) {
      await this.addRenderCellHook(key, options.renderCellHook);
    }
    this.globalCache.columns.push(column);
    this.localColumnCache.push(column.dataKey);
    await this.refresh();
  }

  /**
   * Unregister an extra column. Call it on plugin exit.
   * @param key Column dataKey, should be same as the one used in `register`
   */
  public async unregister(key: string) {
    const Zotero = this.getGlobal("Zotero");
    await this.initializationLock.promise;
    let persisted = Zotero.Prefs.get("pane.persist") as string;

    const persistedJSON = JSON.parse(persisted) as { [key: string]: any };
    delete persistedJSON[key];
    Zotero.Prefs.set("pane.persist", JSON.stringify(persistedJSON));

    const idx = this.globalCache.columns.map((_c) => _c.dataKey).indexOf(key);
    if (idx >= 0) {
      this.globalCache.columns.splice(idx, 1);
    }
    this.removeFieldHook(key);
    this.removeRenderCellHook(key);
    await this.refresh();
    const localKeyIdx = this.localColumnCache.indexOf(key);
    if (localKeyIdx >= 0) {
      this.localColumnCache.splice(localKeyIdx, 1);
    }
  }

  /**
   * Add a patch hook for `getField`, which is called when custom cell is rendered(and in many other cases).
   *
   * Don't patch a Zotero's built-in field.
   * @remarks
   * Don't call it manually unless you understand what you are doing.
   * @param dataKey Cell `dataKey`, e.g. 'title'
   * @param fieldHook patch hook
   */
  public async addFieldHook(
    dataKey: string,
    fieldHook: (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      original: Function
    ) => string
  ) {
    await this.initializationLock.promise;
    if (dataKey in this.globalCache.fieldHooks) {
      this.log(
        "[WARNING] ItemTreeTool.addFieldHook overwrites an existing hook:",
        dataKey
      );
    }
    this.globalCache.fieldHooks[dataKey] = fieldHook;
    this.localFieldCache.push(dataKey);
  }

  /**
   * Remove a patch hook by `dataKey`.
   */
  public removeFieldHook(dataKey: string) {
    delete this.globalCache.fieldHooks[dataKey];
    const idx = this.localFieldCache.indexOf(dataKey);
    if (idx >= 0) {
      this.localFieldCache.splice(idx, 1);
    }
  }

  /**
   * Add a patch hook for `_renderCell`, which is called when cell is rendered.
   *
   * This also works for Zotero's built-in cells.
   * @remarks
   * Don't call it manually unless you understand what you are doing.
   * @param dataKey Cell `dataKey`, e.g. 'title'
   * @param renderCellHook patch hook
   */
  public async addRenderCellHook(
    dataKey: string,
    renderCellHook: (
      index: number,
      data: string,
      column: ColumnOptions,
      original: Function
    ) => HTMLElement
  ) {
    await this.initializationLock.promise;
    if (dataKey in this.globalCache.fieldHooks) {
      this.log(
        "[WARNING] ItemTreeTool.addRenderCellHook overwrites an existing hook:",
        dataKey
      );
    }
    this.globalCache.renderCellHooks[dataKey] = renderCellHook;
    this.localRenderCellCache.push(dataKey);
  }

  /**
   * Remove a patch hook by `dataKey`.
   */
  public async removeRenderCellHook(dataKey: string) {
    delete this.globalCache.renderCellHooks[dataKey];
    const idx = this.localRenderCellCache.indexOf(dataKey);
    if (idx >= 0) {
      this.localRenderCellCache.splice(idx, 1);
    }
    await this.refresh();
  }

  /**
   * Do initializations. Called in constructor to be async
   */
  private async initializeGlobal() {
    const Zotero = this.getGlobal("Zotero");
    await Zotero.uiReadyPromise;
    const window = this.getGlobal("window"),
      globalCache = this.globalCache = ToolkitGlobal.getInstance(Zotero).itemTree;
    if (!globalCache.initialized) {
      globalCache.initialized = true;
      // @ts-ignore
      const itemTree = window.require("zotero/itemTree");
      this.patch(
        itemTree.prototype,
        "getColumns",
        this.patchSign,
        (original) =>
          function () {
            // @ts-ignore
            const columns: ColumnOptions[] = original.apply(this, arguments);
            const insertAfter = columns.findIndex(
              (column) => column.dataKey === "title"
            );
            columns.splice(
              insertAfter + 1,
              0,
              ...globalCache.columns
            );
            return columns;
          }
      );
      this.patch(
        itemTree.prototype,
        "_renderCell",
        this.patchSign,
        (original) =>
          function (index: number, data: string, column: ColumnOptions) {
            if (!(column.dataKey in globalCache.renderCellHooks)) {
              // @ts-ignore
              return original.apply(this, arguments);
            }
            const hook = globalCache.renderCellHooks[column.dataKey];
            const elem = hook(index, data, column, original.bind(this));
            if (elem.classList.contains("cell")) {
              return elem;
            }
            const span = window.document.createElementNS(
              "http://www.w3.org/1999/xhtml",
              "span"
            );
            span.classList.add(
              "cell",
              column.dataKey,
              `${column.dataKey}-item-tree-main-default`
            );
            if (column.fixedWidth) {
              span.classList.add("fixed-width");
            }
            span.appendChild(elem);
            return span;
          }
      );
      this.patch(
        Zotero.Item.prototype,
        "getField",
        this.patchSign,
        (original) =>
          function (
            field: string,
            unformatted: boolean,
            includeBaseMapped: boolean
          ) {
            if (
              globalCache.columns
                .map((_c: ColumnOptions) => _c.dataKey)
                .includes(field)
            ) {
              try {
                const hook = globalCache.fieldHooks[field];
                // @ts-ignore
                return hook(
                  field,
                  unformatted,
                  includeBaseMapped,
                  this,
                  original.bind(this)
                );
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
   * Create a React Icon element
   * @param props
   */
  private createIconLabel(props: {
    iconPath: string;
    name: string;
  }): React.ReactElement {
    // @ts-ignore
    const _React = window.require("react") as typeof React;
    return _React.createElement(
      "span",
      null,
      _React.createElement("img", {
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
   * Refresh itemView. You don't need to call it manually.
   */
  private async refresh() {
    await this.initializationLock.promise;
    const ZoteroPane = this.getGlobal("ZoteroPane");
    ZoteroPane.itemsView._columnsId = null;
    const virtualizedTable = ZoteroPane.itemsView.tree?._columns;
    if (!virtualizedTable) {
      this.log("ItemTree is still loading. Refresh skipped.");
      return;
    }
    // Remove style list otherwise the change will not be updated
    document.querySelector(`.${virtualizedTable._styleKey}`)?.remove();
    // Refresh to rebuild _columns
    await ZoteroPane.itemsView.refreshAndMaintainSelection();
    // Construct a new virtualized-table, otherwise it will not be updated
    ZoteroPane.itemsView.tree._columns =
      new virtualizedTable.__proto__.constructor(ZoteroPane.itemsView.tree);
    // Refresh again to totally make the itemView updated
    await ZoteroPane.itemsView.refreshAndMaintainSelection();
  }
}

export interface ItemTreeExtraColumnsGlobal {
  initialized: boolean;
  columns: ColumnOptions[];
  fieldHooks: {
    [key: string]: (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      original: Function
    ) => string;
  };
  renderCellHooks: {
    [key: string]: (
      index: number,
      data: string,
      column: ColumnOptions,
      original: Function
    ) => HTMLElement;
  };
}

export interface ColumnOptions {
  dataKey: string;
  label: string;
  iconLabel?: React.ReactElement;
  defaultIn?: Set<"default" | "feeds" | "feed" | string>;
  disabledIn?: Set<"default" | "feeds" | "feed" | string>;
  defaultSort?: 1 | -1;
  flex?: number;
  width?: number;
  fixedWidth?: boolean;
  staticWidth?: boolean;
  minWidth?: number;
  ignoreInColumnPicker?: boolean;
  submenu?: boolean;
  zoteroPersist?: Set<string>;
}
