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
      Zotero.debug(
        data
          .map((d) => (typeof d === "object" ? JSON.stringify(d) : String(d)))
          .join("\n")
      );
    }
  } catch (e) {
    console.error(e);
    Zotero.logError(e);
  }
}
