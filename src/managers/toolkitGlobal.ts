import { BasicTool } from "../basic";
import { ItemTreeGlobal } from "./itemTree";
import { Prompt } from "./prompt";
import { ToolkitShortcutsGlobal } from "./shortcut";

/**
 * The Singleton class of global parameters used by managers.
 * @example `ToolkitGlobal.getInstance().itemTree.state`
 */
export default class ToolkitGlobal {
  readonly itemTree: ItemTreeGlobal;
  readonly shortcut: ToolkitShortcutsGlobal;
  readonly prompt: Prompt;
  private constructor() {
    this.itemTree = {
      _ready: false,
      columns: [],
      fieldHooks: {},
      renderCellHooks: {},
    };
    this.shortcut = {
      _ready: false,
      eventKeys: [],
    };
    this.prompt = new Prompt();
  }

  /**
   * Get the global unique instance of `class ToolkitGlobal`.
   * @returns An instance of `ToolkitGlobal`.
   */
  static getInstance(): ToolkitGlobal {
    const Zotero = BasicTool.getZotero();
    if (!("_toolkitGlobal" in Zotero))
      Zotero._toolkitGlobal = new ToolkitGlobal();
    return Zotero._toolkitGlobal;
  }
}

export interface GlobalInstance {
  _ready: boolean;
}
