import React = require("react");
import { BasicOptions, BasicTool } from "../basic";
import { ManagerTool } from "../basic";
import { FieldHookManager, getFieldHookFunc } from "./fieldHook";
import ToolkitGlobal, { GlobalInstance } from "./toolkitGlobal";
import { PatcherManager } from "./patch";

/**
 * Register customized new columns to the library itemTree.
 */
export class ItemTreeManager extends ManagerTool {
  /**
   * Signature to avoid patching more than once.
   */
  private globalCache!: ItemTreeGlobal;
  private localColumnCache: string[];
  private localRenderCellCache: string[];
  private initializationLock: _ZoteroTypes.PromiseObject;
  private fieldHooks: FieldHookManager;
  private patcherManager: PatcherManager;
  private defaultPersist = [
    "width",
    "ordinal",
    "hidden",
    "sortActive",
    "sortDirection",
  ];
  // TODO: update types
  private backend: any;
  /**
   * Initialize Zotero._ItemTreeExtraColumnsGlobal if it doesn't exist.
   *
   * New columns and hooks are stored there.
   *
   * Then patch `require("zotero/itemTree").getColumns` and `Zotero.Item.getField`
   */
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.backend = this.getGlobal("Zotero").ItemTreeManager;
    // TODO: remove these two caches
    this.localColumnCache = [];
    this.localRenderCellCache = [];
    this.fieldHooks = new FieldHookManager(base);
    this.patcherManager = new PatcherManager(base);
    this.initializationLock = this.getGlobal("Zotero").Promise.defer();
    if (!this.backend) {
      this.initializeGlobal();
    } else {
      this.initializationLock.resolve();
    }
  }

  unregisterAll(): void {
    // Skip field hook unregister and use fieldHooks.unregisterAll
    // to unregister those created by this manager only
    [...this.localColumnCache].forEach((key) =>
      this.unregister(key, { skipGetField: true })
    );
    [...this.localRenderCellCache].forEach(
      this.removeRenderCellHook.bind(this)
    );
    this.fieldHooks.unregisterAll();
  }

  /**
   * Register a new column. Don't forget to call `unregister` on plugin exit.
   * @param key Column dataKey
   * @param label Column display label
   * @param getFieldHook Called when loading cell content.
   * If you registered the getField hook somewhere else (in ItemBox or FieldHooks), leave it undefined.
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
    getFieldHook: typeof getFieldHookFunc | undefined,
    options: {
      /** @deprecated Use `enabledTreeIDs` */
      defaultIn?: Set<"default" | "feeds" | "feed" | string>;
      /** @deprecated Use `enabledTreeIDs` */
      disabledIn?: Set<"default" | "feeds" | "feed" | string>;
      enabledTreeIDs?: string[];
      /** @deprecated Use `sortReverse` */
      defaultSort?: 1 | -1;
      sortReverse?: boolean;
      flex?: number;
      width?: number;
      fixedWidth?: boolean;
      staticWidth?: boolean;
      minWidth?: number;
      iconPath?: string;
      htmlLabel?: string;
      /** @deprecated Use `showInColumnPicker` */
      ignoreInColumnPicker?: boolean;
      /** @default true */
      showInColumnPicker?: boolean;
      /** @deprecated Use `columnPickerSubMenu` */
      submenu?: boolean;
      columnPickerSubMenu?: boolean;
      zoteroPersist?: Set<string> | Array<string>;
      dataProvider?: (item: Zotero.Item, dataKey: string) => string;
      renderCell?: (
        index: number,
        data: string,
        column: ColumnOptions & { className: string }
      ) => HTMLSpanElement;
      /** @deprecated Use `renderCell` */
      renderCellHook?: (
        index: number,
        data: string,
        column: ColumnOptions & { className?: string },
        original: Function
      ) => HTMLElement;
    } = {
      showInColumnPicker: true,
    }
  ) {
    await this.initializationLock?.promise;
    if (!this.backend) {
      if (
        this.globalCache.columns
          .map((_c: ColumnOptions) => _c.dataKey)
          .includes(key)
      ) {
        this.log(`ItemTreeTool: ${key} is already registered.`);
        return;
      }
    }
    const column: ColumnOptions = {
      dataKey: key,
      label: label,
      pluginID: this._basicOptions.api.pluginID,
      iconLabel: options.iconPath
        ? this.createIconLabel({
            iconPath: options.iconPath,
            name: label,
          })
        : undefined,
      iconPath: options.iconPath,
      htmlLabel: options.htmlLabel,
      zoteroPersist:
        options.zoteroPersist ||
        (this.backend ? this.defaultPersist : new Set(this.defaultPersist)),
      defaultIn: options.defaultIn,
      disabledIn: options.disabledIn,
      enabledTreeIDs: options.enabledTreeIDs,
      defaultSort: options.defaultSort,
      sortReverse: options.sortReverse || options.defaultSort === -1,
      flex: typeof options.flex === "undefined" ? 1 : options.flex,
      width: options.width,
      fixedWidth: options.fixedWidth,
      staticWidth: options.staticWidth,
      minWidth: options.minWidth,
      ignoreInColumnPicker: options.ignoreInColumnPicker,
      showInColumnPicker:
        typeof options.ignoreInColumnPicker === "undefined"
          ? true
          : options.showInColumnPicker,
      submenu: options.submenu,
      columnPickerSubMenu: options.columnPickerSubMenu || options.submenu,
      dataProvider:
        options.dataProvider ||
        ((item, _dataKey) => item.getField(key as any) as string),
      renderCell: options.renderCellHook as typeof options.renderCell,
    };
    if (getFieldHook) {
      this.fieldHooks.register("getField", key, getFieldHook);
    }
    if (this.backend) {
      return await this.backend.registerColumns(column);
    } else {
      this.globalCache.columns.push(column);
      this.localColumnCache.push(column.dataKey);
      if (options.renderCellHook) {
        await this.addRenderCellHook(key, options.renderCellHook);
      }
      await this.refresh();
    }
  }

  /**
   * Unregister an extra column. Call it on plugin exit.
   * @param key Column dataKey, should be same as the one used in `register`
   * @param options.skipGetField skip unregister of getField hook.
   * This is useful when the hook is not initialized by this instance
   */
  public async unregister(
    key: string,
    options: { skipGetField?: boolean } = {}
  ) {
    await this.initializationLock.promise;
    if (this.backend) {
      await this.backend.unregisterColumns(key);
      if (!options.skipGetField) {
        this.fieldHooks.unregister("getField", key);
      }
      return;
    }
    const Zotero = this.getGlobal("Zotero");
    let persisted = Zotero.Prefs.get("pane.persist") as string;

    const persistedJSON = JSON.parse(persisted) as { [key: string]: any };
    delete persistedJSON[key];
    Zotero.Prefs.set("pane.persist", JSON.stringify(persistedJSON));

    const idx = this.globalCache.columns.map((_c) => _c.dataKey).indexOf(key);
    if (idx >= 0) {
      this.globalCache.columns.splice(idx, 1);
    }
    if (!options.skipGetField) {
      this.fieldHooks.unregister("getField", key);
    }
    this.removeRenderCellHook(key);
    await this.refresh();
    const localKeyIdx = this.localColumnCache.indexOf(key);
    if (localKeyIdx >= 0) {
      this.localColumnCache.splice(localKeyIdx, 1);
    }
  }

  /**
   * Add a patch hook for `_renderCell`, which is called when cell is rendered.
   * @deprecated
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
      column: ColumnOptions & { className?: string },
      original: Function
    ) => HTMLElement
  ) {
    await this.initializationLock.promise;
    if (dataKey in this.globalCache.renderCellHooks) {
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
   * @deprecated
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
    const window = this.getGlobal("window");
    this.globalCache = ToolkitGlobal.getInstance().itemTree;
    const globalCache = this.globalCache;
    if (!globalCache._ready) {
      globalCache._ready = true;
      // @ts-ignore
      const itemTree = window.require("zotero/itemTree");
      if (!this.backend) {
        this.patcherManager.register(
          itemTree.prototype,
          "getColumns",
          (original) =>
            function () {
              // @ts-ignore
              const columns: ColumnOptions[] = original.apply(this, arguments);
              const insertAfter = columns.findIndex(
                (column) => column.dataKey === "title"
              );
              columns.splice(insertAfter + 1, 0, ...globalCache.columns);
              return columns;
            }
        );
      }

      this.patcherManager.register(
        itemTree.prototype,
        "_renderCell",
        (original) =>
          function (index: number, data: string, column: ColumnOptions) {
            if (!(column.dataKey in globalCache.renderCellHooks)) {
              // @ts-ignore
              return original.apply(this, arguments);
            }
            const hook = globalCache.renderCellHooks[column.dataKey];
            // @ts-ignore
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
  public async refresh() {
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

/**
 * @deprecated
 */
export interface ItemTreeGlobal extends GlobalInstance {
  columns: ColumnOptions[];
  renderCellHooks: {
    [key: string]: (
      index: number,
      data: string,
      column: ColumnOptions,
      original: Function
    ) => HTMLElement;
  };
  /**
   * @deprecated moved to fieldHooks
   */
  fieldHooks?: any;
}

export interface ColumnOptions {
  dataKey: string;
  label: string;
  pluginID?: string;
  enabledTreeIDs?: string[];
  /** @deprecated */
  defaultIn?: Set<"default" | "feeds" | "feed" | string> | string[];
  /** @deprecated */
  disabledIn?: Set<"default" | "feeds" | "feed" | string> | string[];
  /** @deprecated */
  defaultSort?: 1 | -1;
  sortReverse?: boolean;
  flex?: number;
  width?: number;
  fixedWidth?: boolean;
  staticWidth?: boolean;
  minWidth?: number;
  iconLabel?: React.ReactElement;
  iconPath?: string;
  htmlLabel?: string;
  /** @deprecated */
  ignoreInColumnPicker?: boolean;
  /** @default true */
  showInColumnPicker?: boolean;
  /** @deprecated */
  submenu?: boolean;
  columnPickerSubMenu?: boolean;
  dataProvider?: (item: Zotero.Item, dataKey: string) => string;
  renderCell?: (
    index: number,
    data: string,
    column: ColumnOptions & { className: string }
  ) => HTMLSpanElement;
  zoteroPersist?: Set<string> | string[];
}
