import React = require("react");
import ReactDOM = require("react-dom");
import { IntlProvider } from "react-intl";
import { BasicTool } from "../basic";

/**
 * VirtualizedTable helper.
 */
export class VirtualizedTableHelper extends BasicTool {
  public props: VirtualizedTableProps;
  public localeStrings: { [name: string]: string };
  public containerId!: string;
  public treeInstance!: VirtualizedTable;
  private window: Window;
  private React: typeof React;
  private ReactDOM: typeof ReactDOM;
  private VirtualizedTable: VirtualizedTableConstructor;
  private IntlProvider: typeof IntlProvider;

  constructor(win: Window) {
    super();
    this.window = win;
    const Zotero = this.getGlobal("Zotero");
    const _require = (win as any).require as Function;
    // Don't actually use any React instance, so that it won't be actually compiled.
    this.React = _require("react");
    this.ReactDOM = _require("react-dom");
    this.VirtualizedTable = _require("components/virtualized-table");
    this.IntlProvider = _require("react-intl").IntlProvider;
    this.props = {
      id: `${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
      getRowCount: () => 0,
    };
    this.localeStrings = Zotero.Intl.strings;
  }

  /**
   * Set properties by name.
   * @remarks
   * `id` and `getRowCount` are required.
   * If `id` is not set, it's a random string.
   * @param propName Property name
   * @param propValue Property value
   */
  public setProp<
    K extends keyof VirtualizedTableProps,
    V extends VirtualizedTableProps[K]
  >(propName: K, propValue: V): VirtualizedTableHelper;
  /**
   * Set properties object.
   * @remarks
   * `id` and `getRowCount` are required.
   * If `id` is not set, it's a random string.
   * @param data property object.
   * @remarks
   * All available properties:
   * ```ts
   * interface VirtualizedTableProps {
   *   id: string;
   *   getRowCount: () => number;
   *   getRowData?: (index: number) => { [dataKey: string]: string };
   *   // Use `getRowData` instead. This property is generated automatically.
   *   renderItem?: (
   *     index: number,
   *     selection: TreeSelection,
   *     oldElem: HTMLElement,
   *     columns: ColumnOptions[]
   *   ) => Node;
   *   // Row height specified as lines of text per row. Defaults to 1
   *   linesPerRow?: number;
   *   // Do not adjust for Zotero-defined font scaling
   *   disableFontSizeScaling?: boolean;
   *   // An array of two elements for alternating row colors
   *   alternatingRowColors?: Array<string>;
   *   // For screen-readers
   *   label?: string;
   *   role?: string;
   *   showHeader?: boolean;
   *   // Array of column objects like the ones in itemTreeColumns.js
   *   columns?: Array<ColumnOptions>;
   *   onColumnPickerMenu?: (event: Event) => void;
   *   onColumnSort?: (event: Event) => void;
   *   getColumnPrefs?: () => { [dataKey: string]: any };
   *   storeColumnPrefs?: (prefs: { [dataKey: string]: any }) => void;
   *   getDefaultColumnOrder?: () => { [dataKey: string]: any };
   *   // Makes columns unmovable, unsortable, etc
   *   staticColumns?: boolean;
   *   // Used for initial column widths calculation
   *   containerWidth?: number;
   *   // Internal windowed-list ref
   *   treeboxRef?: (innerWindowedList: WindowedList) => any;
   *   // Render with display?: none
   *   hide?: boolean;
   *   multiSelect?: boolean;
   *   onSelectionChange?: (
   *     selection: TreeSelection,
   *     shouldDebounce: boolean
   *   ) => void;
   *   // The below are for arrow-key navigation
   *   isSelectable?: (index: number) => boolean;
   *   getParentIndex?: (index: number) => number;
   *   isContainer?: (index: number) => boolean;
   *   isContainerEmpty?: (index: number) => boolean;
   *   isContainerOpen?: (index: number) => boolean;
   *   toggleOpenState?: (index: number) => void;
   *   // A function with signature (index?:Number) => result?:String which will be used
   *   // for find-as-you-type navigation. Find-as-you-type is disabled if prop is undefined.
   *   getRowString?: (index: number) => string;
   *   // If you want to perform custom key handling it should be in this function
   *   // if it returns false then virtualized-table's own key handler won't run
   *   onKeyDown?: (e: Event) => boolean;
   *   onKeyUp?: (e: Event) => boolean;
   *   onDragOver?: (e: Event) => boolean;
   *   onDrop?: (e: Event) => boolean;
   *   // Enter, double-clicking
   *   onActivate?: (e: Event) => boolean;
   *   onFocus?: (e: Event) => boolean;
   *   onItemContextMenu?: (e: Event, x: number, y: number) => boolean;
   * }
   * ```
   */
  public setProp(data: Partial<VirtualizedTableProps>): VirtualizedTableHelper;
  public setProp(...args: any[]) {
    if (args.length === 1) {
      Object.assign(this.props, args[0]);
    } else if (args.length === 2) {
      (this.props[args[0] as keyof VirtualizedTableProps] as unknown) = args[1];
    }
    return this;
  }

  /**
   * Set locale strings, which replaces the table header's label if matches. Default it's `Zotero.Intl.strings`
   * @param localeStrings
   */
  public setLocale(localeStrings: { [name: string]: string }) {
    Object.assign(this.localeStrings, localeStrings);
    return this;
  }

  /**
   * Set container element id that the table will be rendered on.
   * @param id element id
   */
  public setContainerId(id: string) {
    this.containerId = id;
    return this;
  }

  /**
   * Render the table.
   * @param selectId Which row to select after rendering
   * @param onfulfilled callback after successfully rendered
   * @param onrejected callback after rendering with error
   */
  public render(
    selectId?: number,
    onfulfilled?: (value: unknown) => unknown,
    onrejected?: (reason: any) => PromiseLike<never>
  ) {
    const refreshSelection = () => {
      this.treeInstance.invalidate();
      if (typeof selectId !== "undefined" && selectId >= 0) {
        this.treeInstance.selection.select(selectId);
      } else {
        this.treeInstance.selection.clearSelection();
      }
    };
    if (!this.treeInstance) {
      const vtableProps = Object.assign({}, this.props, {
        ref: (ref: VirtualizedTable) => (this.treeInstance = ref),
      });
      if (vtableProps.getRowData && !vtableProps.renderItem) {
        Object.assign(vtableProps, {
          renderItem: this.VirtualizedTable.makeRowRenderer(
            vtableProps.getRowData
          ),
        });
      }
      const elem = this.React.createElement(
        this.IntlProvider,
        { locale: Zotero.locale, messages: Zotero.Intl.strings },
        this.React.createElement(this.VirtualizedTable, vtableProps)
      );
      const container = this.window.document.getElementById(this.containerId);
      new Promise((resolve) =>
        this.ReactDOM.render(elem, container, resolve as () => {})
      )
        .then(() => {
          // Fix style manager showing partially blank until scrolled
          this.getGlobal("setTimeout")(() => {
            refreshSelection();
          });
        })
        .then(onfulfilled, onrejected);
    } else {
      refreshSelection();
    }
    return this;
  }
}

export interface ColumnOptions {
  dataKey: string;
  label: string;
  iconLabel?: React.ReactElement;
  defaultSort?: 1 | -1;
  flex?: number;
  width?: number;
  fixedWidth?: boolean;
  staticWidth?: boolean;
  minWidth?: number;
  ignoreInColumnPicker?: boolean;
  submenu?: boolean;
}

interface VirtualizedTableProps {
  id: string;

  getRowCount: () => number;

  getRowData?: (index: number) => { [dataKey: string]: string };
  /**
   * Use `getRowData` instead. This property is generated automatically.
   * @param index
   * @param selection
   * @param oldElem
   * @param columns
   */
  renderItem?: (
    index: number,
    selection: TreeSelection,
    oldElem: HTMLElement,
    columns: ColumnOptions[]
  ) => Node;
  // Row height specified as lines of text per row. Defaults to 1
  linesPerRow?: number;
  // Do not adjust for Zotero-defined font scaling
  disableFontSizeScaling?: boolean;
  // An array of two elements for alternating row colors
  alternatingRowColors?: Array<string>;
  // For screen-readers
  label?: string;
  role?: string;

  showHeader?: boolean;
  // Array of column objects like the ones in itemTreeColumns.js
  columns?: Array<ColumnOptions>;
  onColumnPickerMenu?: (event: Event) => void;
  onColumnSort?: (event: Event) => void;
  getColumnPrefs?: () => { [dataKey: string]: any };
  storeColumnPrefs?: (prefs: { [dataKey: string]: any }) => void;
  getDefaultColumnOrder?: () => { [dataKey: string]: any };
  // Makes columns unmovable, unsortable, etc
  staticColumns?: boolean;
  // Used for initial column widths calculation
  containerWidth?: number;

  // Internal windowed-list ref
  treeboxRef?: (innerWindowedList: WindowedList) => any;

  // Render with display?: none
  hide?: boolean;

  multiSelect?: boolean;

  onSelectionChange?: (
    selection: TreeSelection,
    shouldDebounce: boolean
  ) => void;

  // The below are for arrow-key navigation
  isSelectable?: (index: number) => boolean;
  getParentIndex?: (index: number) => number;
  isContainer?: (index: number) => boolean;
  isContainerEmpty?: (index: number) => boolean;
  isContainerOpen?: (index: number) => boolean;
  toggleOpenState?: (index: number) => void;

  // A function with signature (index?:Number) => result?:String which will be used
  // for find-as-you-type navigation. Find-as-you-type is disabled if prop is undefined.
  getRowString?: (index: number) => string;

  // If you want to perform custom key handling it should be in this function
  // if it returns false then virtualized-table's own key handler won't run
  onKeyDown?: (e: KeyboardEvent) => boolean;
  onKeyUp?: (e: KeyboardEvent) => boolean;

  onDragOver?: (e: DragEvent) => boolean;
  onDrop?: (e: DragEvent) => boolean;

  // Enter, double-clicking
  onActivate?: (e: MouseEvent) => boolean;

  onFocus?: (e: FocusEvent) => boolean;

  onItemContextMenu?: (
    e: MouseEvent | KeyboardEvent,
    x: number,
    y: number
  ) => boolean;
}

interface VirtualizedTableConstructor
  extends React.ComponentClass<VirtualizedTableProps, {}> {
  renderCell(
    index: number,
    data: string,
    column: HTMLElement,
    dir?: string
  ): HTMLSpanElement;
  renderCheckboxCell(
    index: number,
    data: string,
    column: HTMLElement,
    dir?: string
  ): HTMLSpanElement;
  makeRowRenderer(
    getRowData: (index: number) => { [dataKey: string]: string }
  ): (
    index: number,
    selection: any,
    oldDiv: HTMLDivElement,
    columns: HTMLElement
  ) => any;
  formatColumnName(column: HTMLElement): string;
}

interface VirtualizedTable extends React.Component<VirtualizedTableProps, {}> {
  selection: TreeSelection;
  invalidate: () => void;
}

/**
 * Somewhat corresponds to nsITreeSelection
 * https://udn.realityripple.com/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeSelection
 *
 * @property pivot {Number} The selection "pivot". This is the first item the user selected as part of
 * 		a ranged select (i.e. shift-select).
 * @property focused {Number} The currently selected/focused item.
 * @property count {Number} The number of selected items
 * @property selected {Set} The set of currently selected items
 * @property selectEventsSuppressed {Boolean} Controls whether select events are triggered on selection change.
 */
interface TreeSelection {
  _tree: VirtualizedTable;
  pivot: number;
  focused: number;
  selected: Set<number>;
  _selectEventsSuppressed: boolean;
  /**
   * @param tree {VirtualizedTable} The tree where selection occurs. Will be used to issue
   * updates.
   */
  new (tree: VirtualizedTable): this;

  /**
   * Returns whether the given index is selected.
   * @param index {Number} The index is 0-clamped.
   * @returns {boolean}
   */
  isSelected(index: number): boolean;

  /**
   * Toggles an item's selection state, updates focused item to index.
   * @param index {Number} The index is 0-clamped.
   * @param shouldDebounce {Boolean} Whether the update to the tree should be debounced
   */
  toggleSelect(index: number, shouldDebounce?: boolean): void;

  clearSelection(): void;

  /**
   * Selects an item, updates focused item to index.
   * @param index {Number} The index is 0-clamped.
   * @param shouldDebounce {Boolean} Whether the update to the tree should be debounced
   * @returns {boolean} False if nothing to select and select handlers won't be called
   */
  select(index: number, shouldDebounce?: boolean): boolean;

  rangedSelect(
    from: number,
    to: number,
    augment: boolean,
    isSelectAll: boolean
  ): void;

  /**
   * Performs a shift-select from current pivot to provided index. Updates focused item to index.
   * @param index {Number} The index is 0-clamped.
   * @param augment {Boolean} Adds to existing selection if true
   * @param shouldDebounce {Boolean} Whether the update to the tree should be debounced
   */
  shiftSelect(index: number, augment: boolean, shouldDebounce?: boolean): void;

  /**
   * Calls the onSelectionChange prop on the tree
   * @param shouldDebounce {Boolean} Whether the update to the tree should be debounced
   * @private
   */
  _updateTree(shouldDebounce?: boolean): void;

  get count(): number;

  get selectEventsSuppressed(): boolean;

  set selectEventsSuppressed(val: boolean);
}

interface WindowedList {
  [key: string | number | symbol]: any;
}
