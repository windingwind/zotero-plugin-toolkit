import { BasicTool } from "../basic.js";
import { requireEnv } from "../env.js";

/**
 * Copy helper for text.
 *
 * @deprecated Use `Zotero.Utilities.Internal.copyTextToClipboard()` directly instead.
 *
 * @example
 * Copy plain text
 * ```ts
 * new ClipboardHelper().addText("plain").copy();
 * ```
 */
export class ClipboardHelper extends BasicTool {
  private _text: string = "";

  constructor() {
    super();
    requireEnv("zotero", "ClipboardHelper");
  }

  public addText(source: string, _type?: string) {
    this._text = source;
    return this;
  }

  public copy() {
    Zotero.Utilities.Internal.copyTextToClipboard(this._text);
    return this;
  }
}
