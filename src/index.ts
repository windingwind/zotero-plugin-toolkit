import { ZoteroCompat } from "./compat";
import { ZoteroTool } from "./tool";
import { ItemTreeTool } from "./treeView";
import { ZoteroUI } from "./ui";

/**
 * The base class for all tools.
 * @public
 */
export class ZoteroToolkit {
  /**
   * ZoteroCompat instance. Provides consistent APIs for Zotero 6 & newer (7).
   * @public
   */
  public Compat: ZoteroCompat;
  /**
   * ZoteroTool instance. Provides tool APIs.
   * @public
   */
  public Tool: ZoteroTool;
  /**
   * ZoteroUI instance. Provides UI APIs.
   * @public
   */
  public UI: ZoteroUI;
  public ItemTree: ItemTreeTool;

  constructor() {
    this.Compat = new ZoteroCompat();
    this.Tool = new ZoteroTool();
    this.UI = new ZoteroUI();
    this.ItemTree = new ItemTreeTool();
  }
}

export default ZoteroToolkit;

export { ZoteroCompat, ZoteroTool, ItemTreeTool, ZoteroUI };
