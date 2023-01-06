import { ZoteroCompat } from "./compat";
import { ZoteroKeyTool } from "./key";
import { ZoteroReaderTool } from "./reader";
import { ZoteroTool } from "./tool";
import { ItemTreeTool } from "./treeView";
import { ZoteroUI } from "./ui";
import { RegisterToolBase } from "./utils";

/**
 * The base class for all tools.
 */
export class ZoteroToolkit implements RegisterToolBase {
  /**
   * ZoteroCompat instance. Provides consistent APIs for Zotero 6 & newer (7).
   */
  public Compat: ZoteroCompat;
  /**
   * ZoteroTool instance. Provides tool APIs.
   */
  public Tool: ZoteroTool;
  /**
   * ZoteroUI instance. Provides UI APIs.
   */
  public UI: ZoteroUI;
  /**
   * ItemTreeTool instance. Provides itemTree APIs.
   */
  public ItemTree: ItemTreeTool;
  /**
   * ZoteroReaderTool instance. Provides ReaderInstance APIs.
   */
  public ReaderTool: ZoteroReaderTool;
  public KeyTool: ZoteroKeyTool;

  constructor() {
    this.Compat = new ZoteroCompat();
    this.Tool = new ZoteroTool();
    this.UI = new ZoteroUI();
    this.ItemTree = new ItemTreeTool();
    this.ReaderTool = new ZoteroReaderTool();
    this.KeyTool = new ZoteroKeyTool();
  }

  /**
   * Unregister everything created by `registerSth` method of this instance.
   */
  unregisterAll(): void {
    this.Compat.unregisterAll();
    this.UI.unregisterAll();
    this.ItemTree.unregisterAll();
    this.KeyTool.unregisterAll();
  }
}

export default ZoteroToolkit;

export {
  ZoteroCompat,
  ZoteroKeyTool,
  ZoteroTool,
  ItemTreeTool,
  ZoteroReaderTool,
  ZoteroUI,
};
