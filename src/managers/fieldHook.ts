import { BasicOptions, BasicTool, ManagerTool } from "../basic";
import ToolkitGlobal from "./toolkitGlobal";

/**
 * Item field hooks manager.
 */
export class FieldHookManager extends ManagerTool {
  private globalCache!: FieldHooksGlobal;
  private localCache: {
    type: "getField" | "setField" | "isFieldOfBase";
    field: string;
  }[];

  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.localCache = [];
    this.initializeGlobal();
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
    let hooks = this.getHooksFactory(type);
    if (!hooks) {
      return;
    }
    if (field in hooks) {
      this.log(`[WARNING] ${type}.${field} overwrites an existing hook.`);
    }
    hooks[field] = hook;
    this.localCache.push({ type, field });
  }

  public unregister(
    type: "getField" | "setField" | "isFieldOfBase",
    field: string
  ) {
    let hooks = this.getHooksFactory(type);
    if (hooks) {
      delete hooks[field];
    }
    const idx = this.localCache.findIndex(
      ({ type: cacheType }) => cacheType === type
    );
    if (idx > -1) {
      this.localCache.splice(idx, 1);
    }
  }

  public unregisterAll() {
    [...this.localCache].forEach((cache) => {
      this.unregister(cache.type, cache.field);
    });
  }

  private getHooksFactory(type: string) {
    switch (type) {
      case "getField":
        // For compatibility with older versions of toolkit
        // The getField hooks used to be in itemTree.fieldHooks
        // We should force the patched getField to use the same hook factory,
        const globalItemTree = ToolkitGlobal.getInstance().itemTree;
        const deprecatedHooks = globalItemTree.fieldHooks;
        if (
          deprecatedHooks &&
          deprecatedHooks !== this.globalCache.getFieldHooks
        ) {
          Object.assign(this.globalCache.getFieldHooks, deprecatedHooks);
          globalItemTree.fieldHooks = this.globalCache.getFieldHooks;
        }
        return this.globalCache.getFieldHooks;
        break;
      case "setField":
        return this.globalCache.setFieldHooks;
        break;
      case "isFieldOfBase":
        return this.globalCache.isFieldOfBaseHooks;
        break;
      default:
        break;
    }
  }

  private initializeGlobal() {
    const Zotero = this.getGlobal("Zotero");

    const globalCache = (this.globalCache =
      ToolkitGlobal.getInstance().fieldHooks);
    if (!this.globalCache._ready) {
      this.globalCache._ready = true;
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
            // @ts-ignore
            const originalThis = this;
            if (Object.keys(globalCache.getFieldHooks).includes(field)) {
              try {
                const hook = globalCache.getFieldHooks[field];
                return hook(
                  field,
                  unformatted,
                  includeBaseMapped,
                  originalThis,
                  original.bind(originalThis)
                );
              } catch (e) {
                return field + String(e);
              }
            }
            return original.apply(originalThis, arguments);
          }
      );
      this.patch(
        Zotero.Item.prototype,
        "setField",
        this.patchSign,
        (original) =>
          function (field: string, value: string, loadIn: boolean) {
            // @ts-ignore
            const originalThis = this;
            if (Object.keys(globalCache.setFieldHooks).includes(field)) {
              try {
                const hook = globalCache.setFieldHooks[field];
                return hook(
                  field,
                  value,
                  loadIn,
                  originalThis,
                  original.bind(originalThis)
                );
              } catch (e) {
                return field + String(e);
              }
            }
            return original.apply(originalThis, arguments);
          }
      );
      this.patch(
        Zotero.ItemFields,
        "isFieldOfBase",
        this.patchSign,
        (original) =>
          function (field: string, baseField: string) {
            // @ts-ignore
            const originalThis = this;
            if (Object.keys(globalCache.isFieldOfBaseHooks).includes(field)) {
              try {
                const hook = globalCache.isFieldOfBaseHooks[field];
                return hook(field, baseField, original.bind(originalThis));
              } catch (e) {
                return false;
              }
            }
            return original.apply(originalThis, arguments);
          }
      );
    }
  }
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
