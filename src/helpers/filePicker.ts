/**
   * File picker helper.
   * @param title window title
   * @param mode 
   * @param filters Array<[hint string, filter string]>
   * @param suggestion default file/foler
   * @example
   * ```ts
   * await new FilePickerHelper(
   *   `${Zotero.getString("fileInterface.import")} MarkDown Document`,
   *   "open",
   *   [["MarkDown File(*.md)", "*.md"]]
   * ).open();
   * ```
   */
export class FilePickerHelper {
  private title: string;
  private mode: "open" | "save" | "folder";
  private filters?: [string, string][];
  private suggestion?: string;
  constructor(
    title: string,
    mode: "open" | "save" | "folder",
    filters?: [string, string][],
    suggestion?: string
  ) {
    this.title = title;
    this.mode = mode;
    this.filters = filters;
    this.suggestion = suggestion;
  }

  open(): Promise<string> {
    const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
      Components.interfaces.nsIFilePicker
    );

    if (this.suggestion) fp.defaultString = this.suggestion;

    this.mode = {
      open: Components.interfaces.nsIFilePicker.modeOpen,
      save: Components.interfaces.nsIFilePicker.modeSave,
      folder: Components.interfaces.nsIFilePicker.modeGetFolder,
    }[this.mode];

    fp.init(window, this.title, this.mode);

    for (const [label, ext] of this.filters || []) {
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
}
