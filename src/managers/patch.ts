import { BasicOptions, BasicTool, ManagerTool } from "../basic";

/**
 * Manage all monkey patching functions.
 */
export class PatcherManager extends ManagerTool {
  // record wether a patcher is alive or not
  protected readonly patcherIDMap: Map<string, boolean> = new Map();

  constructor(base?: BasicTool | BasicOptions) {
    super(base);
  }

  /**
   * Patch a function
   * @param object The owner of the function
   * @param funcSign The signature of the function(function name)
   * @param patcher A function that returns the new wrapper of the patched function
   * @returns A unique ID of the patcher, which can be used to unregister the patcher
   */
  register<T, K extends FunctionNamesOf<T>>(
    object: T,
    funcSign: K,
    patcher: (origin: T[K]) => T[K]
  ): string {
    const Zotero = this.getGlobal("Zotero");
    const patchIDMap = this.patcherIDMap;
    let id = Zotero.randomString();
    while (patchIDMap.has(id)) {
      id = Zotero.randomString();
    }
    const origin = object[funcSign];
    patchIDMap.set(id, true);
    this.log("patching ", funcSign);

    (object[funcSign] as any) = function (this: T, ...args: any[]) {
      if (patchIDMap.get(id))
        try {
          return (patcher(origin) as Function).apply(this, args);
        } catch (e) {
          Zotero.logError(e as any);
        }
      return (origin as Function).apply(this, args);
    };
    return id;
  }

  /**
   * Unregister a patcher
   * @param patcherID The ID of the patcher to be unregistered
   */
  unregister(patcherID: string) {
    this.patcherIDMap.delete(patcherID);
  }

  /**
   * Unregister all patchers
   */
  unregisterAll() {
    this.patcherIDMap.clear();
  }
}

type FunctionNamesOf<T> = keyof FunctionsOf<T>;

type FunctionsOf<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
