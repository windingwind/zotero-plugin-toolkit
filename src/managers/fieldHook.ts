import { PatchHelper } from "../_doc";
import { BasicOptions, BasicTool, ManagerTool } from "../basic";

/**
 * Item field hooks manager.
 */
export class FieldHookManager extends ManagerTool {
  private data: FieldData = {
    getField: {},
    setField: {},
    isFieldOfBase: {},
  };

  private patchHelpers: {
    getField: PatchHelper;
    setField: PatchHelper;
    isFieldOfBase: PatchHelper;
  } = {
    getField: new PatchHelper(),
    setField: new PatchHelper(),
    isFieldOfBase: new PatchHelper(),
  };

  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    const _thisHelper = this;
    for (const type of Object.keys(this.patchHelpers) as Array<PatchType>) {
      this.patchHelpers[type].setData({
        target: this.getGlobal("Zotero").Items,
        funcSign: type,
        patcher: (original) =>
          function (field: string, ...args: any[]) {
            // @ts-ignore
            const originalThis = this;
            const handler = _thisHelper.data[type][field];
            if (typeof handler === "function") {
              try {
                // @ts-ignore
                return handler(field, ...args);
              } catch (e) {
                return field + String(e);
              }
            }
            return original.apply(originalThis, arguments);
          },
        enabled: true,
      });
    }
  }

  /**
   * Register `Zotero.Item.getField` hook.
   * @param type
   * @param field
   * @param hook ( field: string, unformatted: boolean, includeBaseMapped: boolean, item: Zotero.Item, original: Function) => string
   */
  public register(
    type: "getField",
    field: string,
    hook: typeof getFieldHookFunc
  ): void;
  /**
   * Register `Zotero.Item.setField` hook.
   * @param type
   * @param field
   * @param hook ( field: string, value: string, loadIn: boolean, item: Zotero.Item, original: Function) => void
   */
  public register(
    type: "setField",
    field: string,
    hook: typeof setFieldHookFunc
  ): void;
  /**
   * Register `Zotero.ItemFields.isFieldOfBase` hook. Used in itemBox.
   * @param type
   * @param field
   * @param hook ( field: string, baseField: string, original: Function) => void
   */
  public register(
    type: "isFieldOfBase",
    field: string,
    hook: typeof isFieldOfBaseHookFunc
  ): void;
  public register(
    type: "getField" | "setField" | "isFieldOfBase",
    field: string,
    hook: any
  ) {
    this.data[type][field] = hook;
  }

  public unregister(
    type: "getField" | "setField" | "isFieldOfBase",
    field: string
  ) {
    delete this.data[type][field];
  }

  public unregisterAll() {
    this.data.getField = {};
    this.data.setField = {};
    this.data.isFieldOfBase = {};
    this.patchHelpers.getField.disable();
    this.patchHelpers.setField.disable();
    this.patchHelpers.isFieldOfBase.disable();
  }
}

type PatchType = "getField" | "setField" | "isFieldOfBase";

interface FieldData {
  getField: {
    [field: string]: typeof getFieldHookFunc;
  };
  setField: {
    [field: string]: typeof setFieldHookFunc;
  };
  isFieldOfBase: {
    [field: string]: typeof isFieldOfBaseHookFunc;
  };
}

export interface FieldHooksGlobal {
  _ready: boolean;
  getFieldHooks: {
    [key: string]: typeof getFieldHookFunc;
  };
  setFieldHooks: {
    [key: string]: typeof setFieldHookFunc;
  };
  isFieldOfBaseHooks: {
    [key: string]: typeof isFieldOfBaseHookFunc;
  };
}

export declare function getFieldHookFunc(
  field: string,
  unformatted: boolean,
  includeBaseMapped: boolean,
  item: Zotero.Item,
  original: Function
): string;

export declare function setFieldHookFunc(
  field: string,
  value: string,
  loadIn: boolean,
  item: Zotero.Item,
  original: Function
): boolean;

export declare function isFieldOfBaseHookFunc(
  field: string,
  baseField: string,
  original: Function
): boolean;
