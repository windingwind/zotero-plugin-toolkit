import { ZoteroCompat } from "./compat";
import { ZoteroReaderTool } from "./reader";
import { ZoteroTool } from "./tool";
import { ItemTreeTool } from "./treeView";
import { ZoteroUI } from "./ui";

/**
 * The base class for all tools.
 */
export class ZoteroToolkit {
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

  constructor() {
    this.Compat = new ZoteroCompat();
    this.Tool = new ZoteroTool();
    this.UI = new ZoteroUI();
    this.ItemTree = new ItemTreeTool();
    this.ReaderTool = new ZoteroReaderTool();
  }
}

export default ZoteroToolkit;

export { ZoteroCompat, ZoteroTool, ItemTreeTool, ZoteroReaderTool, ZoteroUI };
