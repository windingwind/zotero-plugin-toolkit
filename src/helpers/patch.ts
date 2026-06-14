import type { FunctionNamesOf } from "../typings/basic.js";
import { BasicTool } from "../basic.js";

export class PatchHelper extends BasicTool {
  private options?: PatchOptions<any, any>;
  private origin?: any;
  /** The wrapper installed onto the target by {@link setData}. */
  private wrapper?: any;
  private pluginUnloadCallback?: (
    ...args: Parameters<NonNullable<_ZoteroTypes.Plugins.observer["shutdown"]>>
  ) => void;

  constructor() {
    super();
    this.options = undefined;
  }

  public setData<T, K extends FunctionNamesOf<T>>(options: PatchOptions<T, K>) {
    this.options = options;
    const Zotero = this.getGlobal("Zotero");
    const { target, funcSign, patcher, pluginID } = options;
    const origin = target[funcSign];
    this.origin = origin;
    this.log("patching ", funcSign);

    const wrapper = function (this: T, ...args: any[]) {
      if (options.enabled)
        try {
          // eslint-disable-next-line ts/no-unsafe-function-type
          return (patcher(origin) as Function).apply(this, args);
        } catch (e) {
          Zotero.logError(e as any);
        }
      // eslint-disable-next-line ts/no-unsafe-function-type
      return (origin as Function).apply(this, args);
    };
    this.wrapper = wrapper;
    (target[funcSign] as any) = wrapper;

    // When a pluginID is provided, automatically restore the original
    // function once that plugin unloads.
    if (pluginID) {
      this.pluginUnloadCallback = (params) => {
        if (params.id === pluginID) {
          this.unpatch();
        }
      };
      this.addListenerCallback("onPluginUnload", this.pluginUnloadCallback);
    }
    return this;
  }

  /**
   * Restore the original function and stop listening for the plugin unload.
   *
   * This is called automatically when the plugin given by `pluginID` in
   * {@link setData} unloads, but it can also be called manually.
   */
  public unpatch() {
    if (this.pluginUnloadCallback) {
      this.removeListenerCallback("onPluginUnload", this.pluginUnloadCallback);
      this.pluginUnloadCallback = undefined;
    }
    if (this.options) {
      const { target, funcSign } = this.options;
      // Only restore when our wrapper is still installed; otherwise another
      // patch has been layered on top and we must not clobber it.
      if (target[funcSign] === this.wrapper) {
        (target[funcSign] as any) = this.origin;
        this.log("unpatched ", funcSign);
      } else {
        this.log(
          "skip unpatching ",
          funcSign,
          ": the function has been re-patched by others",
        );
      }
    }
    this.options = undefined;
    this.origin = undefined;
    this.wrapper = undefined;
    return this;
  }

  public enable() {
    if (!this.options) throw new Error("No patch data set");
    this.options.enabled = true;
    return this;
  }

  public disable() {
    if (!this.options) throw new Error("No patch data set");
    this.options.enabled = false;
    return this;
  }
}

declare interface PatchOptions<T, K extends FunctionNamesOf<T>> {
  target: T;
  funcSign: K;
  patcher: (origin: T[K]) => T[K];
  enabled: boolean;
  pluginID?: string;
}
