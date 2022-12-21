import { ZoteroCompat } from "./compat";
import { ZoteroTool } from "./tool";
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

  constructor() {
    this.Compat = new ZoteroCompat();
    this.Tool = new ZoteroTool();
    this.UI = new ZoteroUI();
  }
}

export default ZoteroToolkit;

export { ZoteroCompat, ZoteroTool, ZoteroUI };
