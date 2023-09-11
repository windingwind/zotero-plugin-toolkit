import { BasicOptions, BasicTool, ManagerTool } from "../basic";
import {
  FieldHookManager,
  getFieldHookFunc,
  setFieldHookFunc,
} from "./fieldHook";
import { PatcherManager } from "./patch";
import ToolkitGlobal from "./toolkitGlobal";

/**
 * Register customized new row to the library itemBox (right-side info tab).
 */
export class ItemBoxManager extends ManagerTool {
  private globalCache!: ItemBoxGlobal;
  private localCache: string[];
  private fieldHooks: FieldHookManager;
  private patcherManager: PatcherManager;
  private initializationLock: _ZoteroTypes.PromiseObject;

  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.initializationLock = this.getGlobal("Zotero").Promise.defer();
    this.localCache = [];
    this.fieldHooks = new FieldHookManager();
    this.patcherManager = new PatcherManager();
    this.initializeGlobal();
  }

  /**
   * Register a custom row
   * @param field Field name. Used in `getField` and `setField`.
   * @param displayName The row header display text.
   * @param getFieldHook Called when loading row content.
   * If you registered the getField hook somewhere else (in ItemBox or FieldHooks), leave it undefined.
   * @param options
   * @param options.editable If the row is editable.
   * To edit a row, either the `options.setFieldHook` or a custom hook for `setField` created by FieldHookManager is required.
   * @param options.setFieldHook The `setField` hook.
   * @param options.index Target index. By default it's placed at the end of rows.
   * @param options.multiline If the row content is multiline.
   * @param options.collapsible If the row content is collapsible (like abstract field).
   */
  public async register(
    field: string,
    displayName: string,
    getFieldHook: typeof getFieldHookFunc | undefined,
    options: {
      editable?: boolean;
      setFieldHook?: typeof setFieldHookFunc;
      index?: number;
      multiline?: boolean;
      collapsible?: boolean;
    } = {}
  ) {
    this.fieldHooks.register("isFieldOfBase", field, () => false);
    if (getFieldHook) {
      this.fieldHooks.register("getField", field, getFieldHook);
    }
    if (options.editable && options.setFieldHook) {
      this.fieldHooks.register("setField", field, options.setFieldHook);
    }
    this.globalCache.fieldOptions[field] = {
      field,
      displayName,
      editable: options.editable || false,
      index: options.index || -1,
      multiline: options.multiline || false,
      collapsible: options.collapsible || false,
    };
    this.localCache.push(field);
    await this.initializationLock.promise;
    this.refresh();
  }

  /**
   * Unregister a row of specific field.
   * @param field
   * @param options Skip unregister of certain hooks.
   * This is useful when the hook is not initialized by this instance
   * @param options.skipRefresh Skip refresh after unregister.
   */
  unregister(
    field: string,
    options: {
      skipIsFieldOfBase?: boolean;
      skipGetField?: boolean;
      skipSetField?: boolean;
      skipRefresh?: boolean;
    } = {}
  ) {
    delete this.globalCache.fieldOptions[field];
    if (!options.skipIsFieldOfBase) {
      this.fieldHooks.unregister("isFieldOfBase", field);
    }
    if (!options.skipGetField) {
      this.fieldHooks.unregister("getField", field);
    }
    if (!options.skipSetField) {
      this.fieldHooks.unregister("setField", field);
    }
    const idx = this.localCache.indexOf(field);
    if (idx > -1) {
      this.localCache.splice(idx, 1);
    }
    if (!options.skipRefresh) {
      this.refresh();
    }
  }

  public unregisterAll() {
    // Skip field hook unregister and use fieldHooks.unregisterAll
    // to unregister those created by this manager only
    [...this.localCache].forEach((field) =>
      this.unregister(field, {
        skipGetField: true,
        skipSetField: true,
        skipIsFieldOfBase: true,
        skipRefresh: true,
      })
    );
    this.fieldHooks.unregisterAll();
    this.refresh();
  }

  /**
   * Refresh all item boxes.
   */
  public refresh() {
    try {
      Array.from(
        this.getGlobal("document").querySelectorAll(
          this.isZotero7() ? "item-box" : "zoteroitembox"
        )
      ).forEach((elem) => (elem as any).refresh());
    } catch (e) {
      this.log(e);
    }
  }

  private async initializeGlobal() {
    const Zotero = this.getGlobal("Zotero");
    await Zotero.uiReadyPromise;
    const window = this.getGlobal("window");
    this.globalCache = ToolkitGlobal.getInstance().itemBox
    const globalCache = this.globalCache;
    const inZotero7 = this.isZotero7();
    if (!globalCache._ready) {
      globalCache._ready = true;

      let itemBoxInstance;
      if (inZotero7) {
        itemBoxInstance = new (this.getGlobal("customElements").get(
          "item-box"
        )!)();
      } else {
        itemBoxInstance = window.document.querySelector(
          "#zotero-editpane-item-box"
        );
        const wait = 5000;
        let t = 0;
        while (!itemBoxInstance && t < wait) {
          itemBoxInstance = window.document.querySelector(
            "#zotero-editpane-item-box"
          );
          await Zotero.Promise.delay(10);
          t += 10;
        }
        if (!itemBoxInstance) {
          globalCache._ready = false;
          this.log("ItemBox initialization failed");
          return;
        }
      }

      this.patcherManager.register(
        (itemBoxInstance as any).__proto__,
        "refresh",
        (original) =>
          function () {
            // @ts-ignore
            const originalThis = this;
            original.apply(originalThis, arguments);
            for (const extraField of Object.values(globalCache.fieldOptions)) {
              const fieldHeader = document.createElement(
                inZotero7 ? "th" : "label"
              );
              fieldHeader.setAttribute("fieldname", extraField.field);

              const prefKey = `extensions.zotero.pluginToolkit.fieldCollapsed.${extraField.field}`;
              const collapsed =
                extraField.multiline &&
                extraField.collapsible &&
                Zotero.Prefs.get(prefKey, true);

              let headerContent = extraField.displayName;
              if (collapsed) {
                headerContent = `(...)${headerContent}`;
              }
              if (inZotero7) {
                let label = document.createElement("label");
                label.className = "key";
                label.textContent = headerContent;
                fieldHeader.appendChild(label);
              } else {
                fieldHeader.setAttribute("value", headerContent);
              }

              const _clickable = originalThis.clickable;
              originalThis.clickable = extraField.editable;
              const fieldValue = originalThis.createValueElement(
                originalThis.item.getField(extraField.field),
                extraField.field,
                1099
              ) as HTMLElement;
              originalThis.clickable = _clickable;

              // Zotero 6 is multiline by default, while Zotero 7 is not
              if (extraField.multiline && !Zotero.Prefs.get(prefKey, true)) {
                fieldValue.classList.add("multiline");
              } else if (!inZotero7) {
                // disable multiline in Zotero 6
                fieldValue.setAttribute("crop", "end");
                fieldValue.setAttribute("value", fieldValue.innerHTML);
                fieldValue.innerHTML = "";
              }

              if (extraField.collapsible) {
                fieldHeader.addEventListener("click", function (ev) {
                  Zotero.Prefs.set(
                    prefKey,
                    !(Zotero.Prefs.get(prefKey, true) || false),
                    true
                  );
                  originalThis.refresh();
                });
              }

              fieldHeader.addEventListener(
                "click",
                inZotero7
                  ? function (ev) {
                      const inputField = (
                        ev.currentTarget as HTMLElement
                      ).nextElementSibling?.querySelector(
                        "input, textarea"
                      ) as any;
                      if (inputField) {
                        inputField.blur();
                      }
                    }
                  : function (ev) {
                      const inputField = (
                        (ev.currentTarget as HTMLElement)
                          .nextElementSibling as any
                      )?.inputField;
                      if (inputField) {
                        inputField.blur();
                      }
                    }
              );

              const table = inZotero7
                ? originalThis._infoTable
                : originalThis._dynamicFields;
              let fieldIndex = extraField.index;
              // Index 0 must be itemType field.
              if (fieldIndex === 0) {
                fieldIndex = 1;
              }
              if (
                fieldIndex &&
                fieldIndex >= 0 &&
                fieldIndex < table.children.length
              ) {
                originalThis._beforeRow = table.children[fieldIndex];
                originalThis.addDynamicRow(fieldHeader, fieldValue, true);
              } else {
                originalThis.addDynamicRow(fieldHeader, fieldValue);
              }
            }
          }
      );
    }

    this.initializationLock.resolve();
  }
}

export interface ItemBoxGlobal {
  _ready: boolean;
  fieldOptions: {
    [key: string]: {
      field: string;
      displayName: string;
      index: number | undefined;
      editable: boolean;
      multiline: boolean;
      collapsible: boolean;
    };
  };
}
