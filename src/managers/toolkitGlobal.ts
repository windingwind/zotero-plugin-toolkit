import { BasicTool } from "../basic";
import { DebugBridge } from "../utils/debugBridge";
import { FieldHooksGlobal } from "./fieldHook";
import { ItemBoxGlobal } from "./itemBox";
import { ItemTreeGlobal } from "./itemTree";
import { PromptGlobal } from "./prompt";
import { ReaderInstanceGlobal } from "./readerInstance";
import { ShortcutsGlobal } from "./shortcut";

/**
 * The Singleton class of global parameters used by managers.
 * @example `ToolkitGlobal.getInstance().itemTree.state`
 */
export class ToolkitGlobal {
  public debugBridge?: DebugBridge;
  public fieldHooks?: FieldHooksGlobal;
  public itemTree?: ItemTreeGlobal;
  public itemBox?: ItemBoxGlobal;
  public shortcut?: ShortcutsGlobal;
  public prompt?: PromptGlobal;
  public readerInstance?: ReaderInstanceGlobal;

  private constructor() {
    initializeModules(this);
  }

  /**
   * Get the global unique instance of `class ToolkitGlobal`.
   * @returns An instance of `ToolkitGlobal`.
   */
  static getInstance(): Required<ToolkitGlobal> {
    const Zotero = BasicTool.getZotero();
    if (!("_toolkitGlobal" in Zotero)) {
      Zotero._toolkitGlobal = new ToolkitGlobal();
    } else {
      initializeModules(Zotero._toolkitGlobal);
    }
    return Zotero._toolkitGlobal;
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
  setModule(instance, "itemTree", {
    _ready: false,
    columns: [],
    renderCellHooks: {},
  });
  setModule(instance, "itemBox", {
    _ready: false,
    fieldOptions: {},
  });
  setModule(instance, "shortcut", {
    _ready: false,
    eventKeys: [],
  });
  setModule(instance, "prompt", {
    _ready: false,
    instance: undefined,
  });
  setModule(instance, "readerInstance", {
    _ready: false,
    initializedHooks: {},
  });
  DebugBridge.setModule(instance);
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

export interface GlobalInstance {
  _ready: boolean;
}

export default ToolkitGlobal;
