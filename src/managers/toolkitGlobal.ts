import { BasicTool } from "../basic";
import { DebugBridge } from "../utils/debugBridge";
import { PluginBridge } from "../utils/pluginBridge";
import { FieldHooksGlobal } from "./fieldHook";
import { PromptGlobal } from "./prompt";

/**
 * The Singleton class of global parameters used by managers.
 * @example `ToolkitGlobal.getInstance().itemTree.state`
 */
export class ToolkitGlobal {
  public debugBridge?: DebugBridge;
  public pluginBridge?: PluginBridge;
  public fieldHooks?: FieldHooksGlobal;
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
  static getInstance(): Required<ToolkitGlobal> {
    const Zotero = BasicTool.getZotero();
    let requireInit = false;

    if (!("_toolkitGlobal" in Zotero)) {
      Zotero._toolkitGlobal = new ToolkitGlobal();
      requireInit = true;
    }

    const currentGlobal = Zotero._toolkitGlobal as ToolkitGlobal;
    if (currentGlobal.currentWindow !== Zotero.getMainWindow()) {
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
  setModule(instance, "fieldHooks", {
    _ready: false,
    getFieldHooks: {},
    setFieldHooks: {},
    isFieldOfBaseHooks: {},
  });
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
  module: V
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
