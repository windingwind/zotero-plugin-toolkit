import { CopyHelper, log } from "./utils";

/**
 * General tool APIs.
 * @public
 */
export class ZoteroTool {
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
  getCopyHelper() {
    return new CopyHelper();
  }
  /**
   * Open a file picker
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
  openFilePicker(
    title: string,
    mode: "open" | "save" | "folder",
    filters?: [string, string][],
    suggestion?: string
  ) {
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
   * Output to both Zotero.debug and console.log
   * @param data e.g. string, number, object, ...
   */
  log(...data: any) {
    return log(...data);
  }
}
