import { BasicOptions, BasicTool, ManagerTool } from "../basic";
import ToolkitGlobal, { GlobalInstance } from "./toolkitGlobal";

/**
 * Reader instance hooks.
 * @deprecated
 */
export class ReaderInstanceManager extends ManagerTool {
  private globalCache!: ReaderInstanceGlobal;
  private cachedHookIds: string[];
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.cachedHookIds = [];
    this.initializeGlobal();
  }

  /**
   * Register a reader instance hook
   * @deprecated
   * @remarks
   * initialized: called when reader instance is ready
   * @param type hook type
   * @param id hook id
   * @param hook
   */
  register(type: "initialized", id: string, hook: readerInstanceHook) {
    const Zotero = this.getGlobal("Zotero");
    switch (type) {
      case "initialized":
        {
          this.globalCache.initializedHooks[id] = hook;
          Zotero.Reader._readers.forEach(hook);
        }
        break;
      default:
        break;
    }
    this.cachedHookIds.push(id);
  }

  /**
   * Unregister hook by id
   * @param id
   */
  unregister(id: string) {
    delete this.globalCache.initializedHooks[id];
  }

  /**
   * Unregister all hooks
   */
  unregisterAll() {
    this.cachedHookIds.forEach((id) => this.unregister(id));
  }

  private initializeGlobal() {
    this.globalCache = ToolkitGlobal.getInstance().readerInstance;
    if (!this.globalCache._ready) {
      this.globalCache._ready = true;
      const Zotero = this.getGlobal("Zotero");
      const _this = this;
      Zotero.Reader._readers = new (this.getGlobal("Proxy"))(
        Zotero.Reader._readers,
        {
          set(
            target: _ZoteroTypes.ReaderInstance[],
            p: string | symbol,
            newValue: _ZoteroTypes.ReaderInstance,
            receiver: any
          ) {
            target[p as any] = newValue;
            if (!isNaN(Number(p))) {
              Object.values(_this.globalCache.initializedHooks).forEach(
                (hook) => {
                  try {
                    hook(newValue);
                  } catch (e) {
                    _this.log(e);
                  }
                }
              );
            }
            return true;
          },
        }
      );
    }
  }
}

export interface ReaderInstanceGlobal extends GlobalInstance {
  initializedHooks: {
    [id: string]: readerInstanceHook;
  };
}

type readerInstanceHook = (instance: _ZoteroTypes.ReaderInstance) => void;
