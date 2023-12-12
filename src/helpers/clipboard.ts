import { BasicTool } from "../basic";

/**
 * Copy helper for text/richtext/image.
 *
 * @example
 * Copy plain text
 * ```ts
 * new ClipboardHelper().addText("plain", "text/unicode").copy();
 * ```
 * @example
 * Copy plain text & rich text
 * ```ts
 * new ClipboardHelper().addText("plain", "text/unicode")
 *                     .addText("<h1>rich text</h1>", "text/html")
 *                     .copy();
 * ```
 * @example
 * Copy plain text, rich text & image
 * ```ts
 * new ClipboardHelper().addText("plain", "text/unicode")
 *                     .addText("<h1>rich text</h1>", "text/html")
 *                     .addImage("data:image/png;base64,...")
 *                     .copy();
 * ```
 */
export class ClipboardHelper {
  private transferable: any;
  private clipboardService: any;
  private filePath: string = "";

  constructor() {
    this.transferable = Components.classes[
      "@mozilla.org/widget/transferable;1"
    ].createInstance(Components.interfaces.nsITransferable);
    this.clipboardService = Components.classes[
      "@mozilla.org/widget/clipboard;1"
    ].getService(Components.interfaces.nsIClipboard);
    this.transferable.init(null);
  }

  public addText(source: string, type: "text/html" | "text/unicode" = "text/unicode") {
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
    const basicTool = new BasicTool();
    let mime = parts[0].match(/:(.*?);/)![1];
    let bstr = basicTool.getGlobal("window").atob(parts[1]);
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
    if (basicTool.getGlobal("Zotero").platformMajorVersion >= 102) {
      img = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mime);
      mimeType = "application/x-moz-nativeimage";
    } else {
      mimeType = `image/png`;
      img = Components.classes[
        "@mozilla.org/supports-interface-pointer;1"
      ].createInstance(Components.interfaces.nsISupportsInterfacePointer);
      (img as any).data = imgTools.decodeImageFromArrayBuffer(
        u8arr.buffer,
        mimeType
      );
    }
    this.transferable.addDataFlavor(mimeType);
    this.transferable.setTransferData(mimeType, img, 0);
    return this;
  }

  public addFile(path: string) {
    const file = Components.classes["@mozilla.org/file/local;1"].createInstance(
      Components.interfaces.nsIFile
    );
    file.initWithPath(path);
    this.transferable.addDataFlavor("application/x-moz-file");
    this.transferable.setTransferData("application/x-moz-file", file);
    this.filePath = path;
    return this;
  }

  public copy() {
    try {
      this.clipboardService.setData(
        this.transferable,
        null,
        Components.interfaces.nsIClipboard.kGlobalClipboard
      );
    } catch (e) {
      // For unknown reasons, on MacOS the copy will throw 0x80004005 error.
      if (this.filePath && Zotero.isMac) {
        Zotero.Utilities.Internal.exec(`/usr/bin/osascript`, [
          `-e`,
          `set the clipboard to POSIX file "${this.filePath}"`,
        ]);
      } else {
        throw e;
      }
    }

    return this;
  }
}
