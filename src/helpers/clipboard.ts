import { BasicTool } from "../basic";

/**
 * Copy helper for text/richtext/image.
 *
 * @example
 * Copy plain text
 * ```ts
 * new ClibpoardHelper().addText("plain", "text/unicode").copy();
 * ```
 * @example
 * Copy plain text & rich text
 * ```ts
 * new ClibpoardHelper().addText("plain", "text/unicode")
 *                     .addText("<h1>rich text</h1>", "text/html")
 *                     .copy();
 * ```
 * @example
 * Copy plain text, rich text & image
 * ```ts
 * new ClibpoardHelper().addText("plain", "text/unicode")
 *                     .addText("<h1>rich text</h1>", "text/html")
 *                     .addImage("data:image/png;base64,...")
 *                     .copy();
 * ```
 */
export class ClibpoardHelper {
  private transferable: any;
  private clipboardService: any;

  constructor() {
    this.transferable = Components.classes[
      "@mozilla.org/widget/transferable;1"
    ].createInstance(Components.interfaces.nsITransferable);
    this.clipboardService = Components.classes[
      "@mozilla.org/widget/clipboard;1"
    ].getService(Components.interfaces.nsIClipboard);
    this.transferable.init(null);
  }

  public addText(source: string, type: "text/html" | "text/unicode") {
    const str = Components.classes[
      "@mozilla.org/supports-string;1"
    ].createInstance(Components.interfaces.nsISupportsString);
    str.data = source;
    this.transferable.addDataFlavor(type);
    this.transferable.setTransferData(type, str, source.length * 2);
    return this;
  }

  public addImage(source: string) {
    let parts = source.split(",");
    if (!parts[0].includes("base64")) {
      return this;
    }
    let mime = parts[0].match(/:(.*?);/)[1];
    let bstr = atob(parts[1]);
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    let imgTools = Components.classes["@mozilla.org/image/tools;1"].getService(
      Components.interfaces.imgITools
    );
    let mimeType: string;
    let img: unknown;
    if (BasicTool.getZotero().platformMajorVersion >= 102) {
      img = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mime);
      mimeType = 'application/x-moz-nativeimage';
    }
    else {
      mimeType = `image/png`;
      img = Components.classes[
        "@mozilla.org/supports-interface-pointer;1"
      ].createInstance(Components.interfaces.nsISupportsInterfacePointer);
      (img as any).data = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mimeType);
    }
    this.transferable.addDataFlavor(mimeType);
    this.transferable.setTransferData(mimeType, img, 0);
    return this;
  }

  public copy() {
    this.clipboardService.setData(
      this.transferable,
      null,
      Components.interfaces.nsIClipboard.kGlobalClipboard
    );
    return this;
  }
}
