export interface RegisterToolBase {
  /**
   * Unregister everything
   */
  unregisterAll(): void;
}

function getZotero(): _ZoteroConstructable {
  if (typeof Zotero === "undefined") {
    return Components.classes["@zotero.org/Zotero;1"].getService(
      Components.interfaces.nsISupports
    ).wrappedJSObject;
  }
  return Zotero;
}

interface globalGetterInterface {
  get(k: "Zotero" | "zotero"): _ZoteroConstructable;
  get(k: "window"): Window;
  get(k: "document"): Document;
  get(k: "ZoteroPane" | "ZoteroPane_Local"): _ZoteroPaneConstructable;
  get(k: "Zotero_Tabs"): typeof Zotero_Tabs;
  get(k: "Zotero_File_Interface"): typeof Zotero_File_Interface;
  get(k: "Zotero_File_Exporter"): any;
  get(k: "Zotero_LocateMenu"): any;
  get(k: "Zotero_Report_Interface"): any;
  get(k: "Zotero_Timeline_Interface"): any;
  get(k: "Zotero_Tooltip"): any;
  get(k: "ZoteroContextPane"): typeof ZoteroContextPane;
  get(k: "ZoteroItemPane"): any;
  get(k: string): any;
}

const globalGetter: globalGetterInterface = {
  // @ts-ignore
  get(k: string) {
    const Zotero = getZotero();
    const window = Zotero.getMainWindow();
    switch (k) {
      case "Zotero":
      case "zotero":
        return Zotero;
      case "window":
        return window;
      case "document":
        return window.document;
      case "ZoteroPane":
      case "ZoteroPane_Local":
        return Zotero.getActiveZoteroPane();
      default:
        return window[k];
        break;
    }
  },
};

export const getGlobal = globalGetter.get;

export function createXULElement(doc: Document, type: string): XUL.Element {
  if (getZotero().platformMajorVersion >= 102) {
    // @ts-ignore
    return doc.createXULElement(type);
  } else {
    return doc.createElementNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      type
    ) as XUL.Element;
  }
}

export function log(...data: any[]) {
  if (data.length === 0) {
    return;
  }
  const Zotero = getZotero();
  // @ts-ignore
  const console = Zotero.getMainWindow().console as Console;
  let options = {
    disableConsole: false,
    disableZLog: false,
    prefix: "",
  };
  if (data[data.length - 1]?._type === "toolkitlog") {
    options = data.pop();
  }
  try {
    if (options.prefix) {
      data.splice(0, 0, options.prefix);
    }
    if (!options.disableConsole) {
      console.groupCollapsed(...data);
      console.trace();
      console.groupEnd();
    }
    if (!options.disableZLog) {
      Zotero.debug(data.map((d) => String(d)).join("\n"));
    }
  } catch (e) {
    console.error(e);
    Zotero.logError(e);
  }
}

export class CopyHelper {
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
      return;
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
    let imgPtr = Components.classes[
      "@mozilla.org/supports-interface-pointer;1"
    ].createInstance(Components.interfaces.nsISupportsInterfacePointer);
    imgPtr.data = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mime);
    this.transferable.addDataFlavor(mime);
    this.transferable.setTransferData(mime, imgPtr, 0);
    return this;
  }

  public copy() {
    this.clipboardService.setData(
      this.transferable,
      null,
      Components.interfaces.nsIClipboard.kGlobalClipboard
    );
  }
}
