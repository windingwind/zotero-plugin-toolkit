import { LineOptions } from "./options";
import { log } from "./utils";

/**
 * General tool APIs.
 * @public
 */
export class ZoteroTool {
  /**
   * Log options.
   * @remarks
   * default:
   * ```ts
   * {
   *   disableConsole: false,
   *   disableZLog: false,
   *   prefix: "",
   * }
   * ```
   * `_type` is for recognization, don't modify it.
   */
  logOptionsGlobal: {
    _type: "toolkitlog";
    disableConsole: boolean;
    disableZLog: boolean;
    prefix: string;
  };

  constructor() {
    this.logOptionsGlobal = {
      _type: "toolkitlog",
      disableConsole: false,
      disableZLog: false,
      prefix: "",
    };
  }

  /**
   * create a `CopyHelper` instance for text/rich text/image
   *
   * @example
   * Copy plain text
   * ```ts
   * const tool = new ZoteroTool();
   * tool.getCopyHelper().addText("plain", "text/unicode").copy();
   * ```
   * @example
   * Copy plain text & rich text
   * ```ts
   * const tool = new ZoteroTool();
   * tool.getCopyHelper().addText("plain", "text/unicode")
   *                     .addText("<h1>rich text</h1>", "text/html")
   *                     .copy();
   * ```
   * @example
   * Copy plain text, rich text & image
   * ```ts
   * const tool = new ZoteroTool();
   * tool.getCopyHelper().addText("plain", "text/unicode")
   *                     .addText("<h1>rich text</h1>", "text/html")
   *                     .addImage("data:image/png;base64,...")
   *                     .copy();
   * ```
   */
  createCopyHelper() {
    return new CopyHelper();
  }

  /**
   * @deprecated Use `createCopyHelper`.
   * @alpha
   */
  getCopyHelper() {
    return this.createCopyHelper();
  }

  /**
   * Create a file picker
   * @param title window title
   * @param mode 
   * @param filters Array<[hint string, filter string]>
   * @param suggestion default file/foler
   * @example
   * ```ts
   * const tool = new ZoteroTool();
   * await tool.openFilePicker(
      `${Zotero.getString("fileInterface.import")} MarkDown Document`,
      "open",
      [["MarkDown File(*.md)", "*.md"]]
    );
    ```
   */
  createFilePicker(
    title: string,
    mode: "open" | "save" | "folder",
    filters?: [string, string][],
    suggestion?: string
  ): Promise<string> {
    const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
      Components.interfaces.nsIFilePicker
    );

    if (suggestion) fp.defaultString = suggestion;

    mode = {
      open: Components.interfaces.nsIFilePicker.modeOpen,
      save: Components.interfaces.nsIFilePicker.modeSave,
      folder: Components.interfaces.nsIFilePicker.modeGetFolder,
    }[mode];

    fp.init(window, title, mode);

    for (const [label, ext] of filters || []) {
      fp.appendFilter(label, ext);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new Promise((resolve) => {
      fp.open((userChoice) => {
        switch (userChoice) {
          case Components.interfaces.nsIFilePicker.returnOK:
          case Components.interfaces.nsIFilePicker.returnReplace:
            resolve(fp.file.path);
            break;

          default: // aka returnCancel
            resolve("");
            break;
        }
      });
    });
  }

  /**
   * @deprecated Use `createFilePicker`
   * @alpha
   * @param title
   * @param mode
   * @param filters
   * @param suggestion
   */
  openFilePicker(
    title: string,
    mode: "open" | "save" | "folder",
    filters?: [string, string][],
    suggestion?: string
  ): Promise<string> {
    return this.createFilePicker(title, mode, filters, suggestion);
  }

  /**
   * Create a ProgressWindow instance
   * @param header window header
   * @param options
   * @example
   * Show a popup with success icon
   * ```ts
   * const tool = new ZoteroTool();
   * tool.createProgressWindow("Addon").createLine({
   *   type: "success",
   *   text: "Finish"
   *   progress: 100,
   * }).show();
   * ```
   * @example
   * Show a popup and change line content
   * ```ts
   * const compat = new ZoteroCompat();
   * const tool = new ZoteroTool();
   * const popupWin = tool.createProgressWindow("Addon").createLine({
   *   text: "Loading"
   *   progress: 50,
   * }).show(-1);
   * // Do operations
   * compat.getGlobal("setTimeout")(()=>{
   *   popupWin.changeLine({
   *     text: "Finish",
   *     progress: 100,
   *   });
   * }, 3000);
   * ```
   */
  createProgressWindow(
    header: string,
    options?: { window?: Window; closeOnClick?: boolean; closeTime?: number }
  ) {
    return new PopupWindow(header, options);
  }

  /**
   * Get icon uri
   * @param key
   */
  getIconURI(key: string) {
    return icons[key];
  }

  /**
   * Set custom icon uri for progress window
   * @param key
   * @param uri
   */
  setIconURI(key: string, uri: string) {
    icons[key] = uri;
  }
  /**
   * Output to both Zotero.debug and console.log
   * @param data e.g. string, number, object, ...
   */
  log(...data: any) {
    if (data.length === 0) {
      return;
    }
    // If logOption is not provides, use the global one.
    if (data[data.length - 1]?._type !== "toolkitlog") {
      data.push(this.logOptionsGlobal);
    }
    return log(...data);
  }

  /**
   * Patch a function
   * @param object The owner of the function
   * @param funcSign The signature of the function(function name)
   * @param ownerSign The signature of patch owner to avoid patching again
   * @param patcher The new wrapper of the patched funcion
   */
  patch(
    object: { [sign: string]: any },
    funcSign: string,
    ownerSign: string,
    patcher: (fn: Function) => Function
  ) {
    if (object[funcSign][ownerSign]) {
      throw new Error(`${funcSign} re-patched`);
    }
    this.log("patching", funcSign, `by ${ownerSign}`);
    object[funcSign] = patcher(object[funcSign]);
    object[funcSign][ownerSign] = true;
  }

  /**
   * Get all extra fields
   * @param item
   */
  getExtraFields(
    item: Zotero.Item,
    backend: "default" | "custom" = "custom"
  ): Map<string, string> {
    const extraFiledRaw = item.getField("extra") as string;
    if (backend === "default") {
      return Zotero.Utilities.Internal.extractExtraFields(extraFiledRaw).fields;
    } else {
      const map = new Map<string, string>();
      extraFiledRaw.split("\n").forEach((line) => {
        const split = line.split(": ");
        if (split.length >= 2 && split[0]) {
          map.set(split[0], split.slice(1).join(": "));
        }
      });
      return map;
    }
  }

  /**
   * Get extra field value by key. If it does not exists, return undefined.
   * @param item
   * @param key
   */
  getExtraField(item: Zotero.Item, key: string): string | undefined {
    const fields = this.getExtraFields(item);
    return fields.get(key);
  }

  /**
   * Replace extra field of an item.
   * @param item
   * @param fields
   */
  async replaceExtraFields(
    item: Zotero.Item,
    fields: Map<string, string>
  ): Promise<void> {
    let kvs = [];
    fields.forEach((v, k) => {
      kvs.push(`${k}: ${v}`);
    });
    item.setField("extra", kvs.join("\n"));
    await item.saveTx();
  }

  /**
   * Set an key-value pair to the item's extra field
   * @param item
   * @param key
   * @param value
   */
  async setExtraField(
    item: Zotero.Item,
    key: string,
    value: string
  ): Promise<void> {
    const fields = this.getExtraFields(item);
    fields.set(key, value);
    await this.replaceExtraFields(item, fields);
  }
}

/**
 * @alpha
 */
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

/**
 * Icon dict. Add your custom icons here.
 * @default
 * ```ts
 * {
 *   success: "chrome://zotero/skin/tick.png",
 *   fail: "chrome://zotero/skin/cross.png",
 * };
 * ```
 */
const icons = {
  success: "chrome://zotero/skin/tick.png",
  fail: "chrome://zotero/skin/cross.png",
};

/**
 * @alpha
 */
export class PopupWindow extends Zotero.ProgressWindow {
  private lines: _ZoteroItemProgress[];
  private closeTime: number | undefined;
  private originalShow: typeof Zotero.ProgressWindow.prototype.show;
  // @ts-ignore
  public show!: typeof this.showWithTimer;

  constructor(
    header: string,
    options: {
      window?: Window;
      closeOnClick?: boolean;
      closeTime?: number;
    } = {
      closeOnClick: true,
      closeTime: 5000,
    }
  ) {
    super(options);
    this.lines = [];
    this.closeTime = options.closeTime || 5000;
    this.changeHeadline(header);
    this.originalShow = this
      .show as unknown as typeof Zotero.ProgressWindow.prototype.show;
    this.show = this.showWithTimer;
  }

  createLine(options: LineOptions) {
    const icon = this.getIcon(options.type, options.icon);
    const line = new this.ItemProgress(icon || "", options.text || "");
    if (typeof options.progress === "number") {
      line.setProgress(options.progress);
    }
    this.lines.push(line);
    return this;
  }

  changeLine(options: LineOptions) {
    if (this.lines?.length === 0) {
      return this;
    }
    const idx =
      typeof options.idx !== "undefined" &&
      options.idx >= 0 &&
      options.idx < this.lines.length
        ? options.idx
        : 0;
    const icon = this.getIcon(options.type, options.icon);
    options.text && this.lines[idx].setText(options.text);
    icon && this.lines[idx].setIcon(icon);
    typeof options.progress === "number" &&
      this.lines[idx].setProgress(options.progress);
    return this;
  }

  protected showWithTimer(closeTime: number | undefined = undefined) {
    this.originalShow();
    typeof closeTime !== "undefined" && (this.closeTime = closeTime);
    if (this.closeTime && this.closeTime > 0) {
      this.startCloseTimer(this.closeTime);
    }
    return this;
  }

  protected getIcon(type: string | undefined, defaulIcon?: string | undefined) {
    return type && type in icons ? icons[type] : defaulIcon;
  }
}
