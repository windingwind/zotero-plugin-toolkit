import type { FunctionNamesOf } from "../typings/basic.js";
import { BasicTool } from "../basic.js";

interface NativeWrapperHandle {
  wrapper: any;
  setup: (origin: any, patcher: any, logError: any, enabled: boolean) => void;
  setEnabled: (enabled: boolean) => void;
}

/**
 * Factory evaluated in the target's global so the wrapper is native to it.
 * When disabled, the dispatch never touches `patcher`, so the wrapper holds
 * only references native to the target's global and stays callable after the
 * patching plugin's sandbox is nuked.
 */
const WRAPPER_FACTORY_SOURCE = `
"use strict";
var state = { enabled: false, patcher: null, origin: null, logError: null };
function wrapper() {
  if (state.enabled) {
    try {
      return state.patcher(state.origin).apply(this, arguments);
    } catch (e) {
      try { state.logError(e); } catch (e2) {}
    }
  }
  return state.origin.apply(this, arguments);
}
return {
  wrapper: wrapper,
  setup: function (origin, patcher, logError, enabled) {
    state.origin = origin; state.patcher = patcher;
    state.logError = logError; state.enabled = !!enabled;
  },
  setEnabled: function (v) { state.enabled = !!v; },
};
`;

function createNativeWrapper(target: any): NativeWrapperHandle {
  const Cu =
    (globalThis as any).Components?.utils ?? (globalThis as any).ChromeUtils;
  const global = Cu.getGlobalForObject(target);
  return new global.Function(WRAPPER_FACTORY_SOURCE)() as NativeWrapperHandle;
}

export class PatchHelper extends BasicTool {
  private options?: PatchOptions<any, any>;
  private handle?: NativeWrapperHandle;
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
    this.log("patching ", funcSign);

    const handle = createNativeWrapper(target);
    handle.setup(
      target[funcSign],
      patcher,
      (e: any) => Zotero.logError(e),
      !!options.enabled,
    );
    this.handle = handle;
    (target[funcSign] as any) = handle.wrapper;

    // Disable automatically when the plugin unloads, before its sandbox is nuked.
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
   * Disable this patch and stop listening for the plugin unload. The wrapper
   * stays installed as a transparent pass-through; being native to the target's
   * global it survives a sandbox nuke, so patches stacked on top are unaffected.
   */
  public unpatch() {
    if (this.pluginUnloadCallback) {
      this.removeListenerCallback("onPluginUnload", this.pluginUnloadCallback);
      this.pluginUnloadCallback = undefined;
    }
    this.handle?.setEnabled(false);
    if (this.options) this.options.enabled = false;
    this.options = undefined;
    this.handle = undefined;
    return this;
  }

  public enable() {
    if (!this.options) throw new Error("No patch data set");
    this.options.enabled = true;
    this.handle?.setEnabled(true);
    return this;
  }

  public disable() {
    if (!this.options) throw new Error("No patch data set");
    this.options.enabled = false;
    this.handle?.setEnabled(false);
    return this;
  }
}

declare interface PatchOptions<T, K extends FunctionNamesOf<T>> {
  target: T;
  funcSign: K;
  patcher: (origin: T[K]) => T[K];
  enabled: boolean;
  /** When provided, the patch is disabled when the plugin with this id unloads. */
  pluginID?: string;
}
