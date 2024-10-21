import type { PromptGlobal } from "./prompt.js";
import { BasicTool } from "../basic.js";
import { DebugBridge } from "../utils/debugBridge.js";
import { PluginBridge } from "../utils/pluginBridge.js";

/**
 * The Singleton class of global parameters used by managers.
 * @example `ToolkitGlobal.getInstance().itemTree.state`
 */
export class ToolkitGlobal {
  public debugBridge?: DebugBridge;
  public pluginBridge?: PluginBridge;
  public prompt?: PromptGlobal;

  public currentWindow?: Window;

  private constructor() {
    initializeModules(this);
    this.currentWindow = BasicTool.getZotero().getMainWindow();
  }

  /**
   * Get the global unique instance of `class ToolkitGlobal`.
   * @returns An instance of `ToolkitGlobal`.
   */
  static getInstance(): Required<ToolkitGlobal> | undefined {
    let _Zotero: _ZoteroTypes.Zotero | undefined;
    try {
      if (typeof Zotero !== "undefined") {
        _Zotero = Zotero;
      } else {
        _Zotero = BasicTool.getZotero();
      }
    } catch {}
    if (!_Zotero) {
      return undefined;
    }
    let requireInit = false;

    if (!("_toolkitGlobal" in _Zotero)) {
      _Zotero._toolkitGlobal = new ToolkitGlobal();
      requireInit = true;
    }

    const currentGlobal = _Zotero._toolkitGlobal as ToolkitGlobal;
    if (currentGlobal.currentWindow !== _Zotero.getMainWindow()) {
      checkWindowDependentModules(currentGlobal);
      requireInit = true;
    }

    if (requireInit) {
      initializeModules(currentGlobal);
    }

    return currentGlobal as Required<ToolkitGlobal>;
  }
}

/**
 * Initialize global modules using the data of this toolkit build.
 * Modules and their properties that do not exist will be updated.
 * @param instance ToolkitGlobal instance
 */
function initializeModules(instance: ToolkitGlobal) {
  setModule(instance, "prompt", {
    _ready: false,
    instance: undefined,
  });
  DebugBridge.setModule(instance);
  PluginBridge.setModule(instance);
}

function setModule<K extends keyof ToolkitGlobal, V extends ToolkitGlobal[K]>(
  instance: ToolkitGlobal,
  key: K,
  module: V,
) {
  if (!module) {
    return;
  }
  if (!instance[key]) {
    instance[key] = module;
  }
  for (const moduleKey in module) {
    (instance[key] as typeof module)[moduleKey] ??= (module as typeof module)[
      moduleKey
    ];
  }
}

function checkWindowDependentModules(instance: ToolkitGlobal) {
  instance.currentWindow = BasicTool.getZotero().getMainWindow();
  instance.prompt = undefined;
}

export interface GlobalInstance {
  _ready: boolean;
}

export default ToolkitGlobal;
