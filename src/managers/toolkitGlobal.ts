import { BasicTool } from "../basic";
import { ItemTreeGlobal } from "./itemTree";
import { ToolkitShortcutsGlobal } from "./shortcut";

/**
 * The Singleton class of global parameters used by managers.
 * @example `ToolkitGlobal.getInstance().itemTree.state`
 */
export default class ToolkitGlobal {
  readonly itemTree: ItemTreeGlobal;
  readonly shortcut: ToolkitShortcutsGlobal;

  private constructor() {
    this.itemTree = {
      _state: "idle",
      columns: [],
      fieldHooks: {},
      renderCellHooks: {},
    };
    this.shortcut = {
      _state: "idle",
      eventKeys: [],
    };
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

  /**
   * Wait for instance if it is loading.
   * @param instence
   */
  static async waitGlobalInstance(instence: GlobalInstance) {
    const Zotero = BasicTool.getZotero();
    let t = 0;
    while (instence._state === "loading" && t <= 5000) {
      await Zotero.Promise.delay(10);
      t += 10;
    }
    return;
  }
}

export interface GlobalInstance {
  _state: "idle" | "loading" | "ready";
}
