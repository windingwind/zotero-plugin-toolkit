import { BasicTool } from "../basic.js";

/**
 * File picker helper.
 * @param title window title
 * @param mode
 * @param filters Array<[hint string, filter string]>
 * @param suggestion default file/folder
 * @param window the parent window. By default it is the main window
 * @param filterMask built-in filters
 * @param directory directory in which to open the file picker
 * @example
 * ```ts
 * await new FilePickerHelper(
 *   `${Zotero.getString("fileInterface.import")} MarkDown Document`,
 *   "open",
 *   [["MarkDown File(*.md)", "*.md"]]
 * ).open();
 * ```
 */
export class FilePickerHelper<
  MODE extends "open" | "save" | "folder" | "multiple",
> extends BasicTool {
  private title: string;
  private mode: MODE;
  private filters?: [string, string][];
  private suggestion?: string;
  private directory?: string;
  private window?: Window | undefined;
  private filterMask?:
    | "all"
    | "html"
    | "text"
    | "images"
    | "xml"
    | "apps"
    | "urls"
    | "audio"
    | "video";
  constructor(
    title: string,
    mode: MODE,
    filters?: [string, string][],
    suggestion?: string,
    window?: Window,
    filterMask?:
      | "all"
      | "html"
      | "text"
      | "images"
      | "xml"
      | "apps"
      | "urls"
      | "audio"
      | "video",
    directory?: string,
  ) {
    super();
    this.title = title;
    this.mode = mode;
    this.filters = filters;
    this.suggestion = suggestion;
    this.directory = directory;
    this.window = window;
    this.filterMask = filterMask;
  }

  async open(): Promise<(MODE extends "multiple" ? string[] : string) | false> {
    const Backend = ChromeUtils.importESModule(
      "chrome://zotero/content/modules/filePicker.mjs",
    ).FilePicker;
    const fp = new Backend();
    fp.init(
      this.window || this.getGlobal("window"),
      this.title,
      this.getMode(fp),
    );
    for (const [label, ext] of this.filters || []) {
      fp.appendFilter(label, ext);
    }
    if (this.filterMask) fp.appendFilters(this.getFilterMask(fp));
    if (this.suggestion) fp.defaultString = this.suggestion;
    if (this.directory) fp.displayDirectory = this.directory;
    const userChoice = await fp.show();
    switch (userChoice) {
      case fp.returnOK:
      case fp.returnReplace:
        return this.mode === "multiple" ? fp.files : fp.file;
      default: // aka returnCancel
        return false;
    }
  }

  private getMode(fp: any) {
    switch (this.mode) {
      case "open":
        return fp.modeOpen;
      case "save":
        return fp.modeSave;
      case "folder":
        return fp.modeGetFolder;
      case "multiple":
        return fp.modeOpenMultiple;
      default:
        return 0;
    }
  }

  private getFilterMask(fp: any) {
    switch (this.filterMask) {
      case "all":
        return fp.filterAll;
      case "html":
        return fp.filterHTML;
      case "text":
        return fp.filterText;
      case "images":
        return fp.filterImages;
      case "xml":
        return fp.filterXML;
      case "apps":
        return fp.filterApps;
      case "urls":
        return fp.filterAllowURLs;
      case "audio":
        return fp.filterAudio;
      case "video":
        return fp.filterVideo;
      default:
        return 0x001;
    }
  }
}
