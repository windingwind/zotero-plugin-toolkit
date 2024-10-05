import { BasicTool } from "../basic.js";

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
const icons: { [key: string | number]: string } = {
  success: "chrome://zotero/skin/tick.png",
  fail: "chrome://zotero/skin/cross.png",
};

/**
 * ProgressWindow helper.
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
export class ProgressWindowHelper extends BasicTool.getZotero().ProgressWindow {
  private lines: Zotero.ItemProgress[];
  private closeTime: number | undefined;
  private originalShow: typeof Zotero.ProgressWindow.prototype.show;
  // @ts-expect-error override show
  public declare show: typeof _popupWindowShow;

  /**
   *
   * @param header window header
   * @param options
   * @param options.window
   * @param options.closeOnClick
   * @param options.closeTime
   * @param options.closeOtherProgressWindows
   */
  constructor(
    header: string,
    options: {
      window?: Window;
      closeOnClick?: boolean;
      closeTime?: number;
      closeOtherProgressWindows?: boolean;
    } = {
      closeOnClick: true,
      closeTime: 5000,
    },
  ) {
    super(options);
    this.lines = [];
    this.closeTime = options.closeTime || 5000;
    this.changeHeadline(header);
    this.originalShow = this
      .show as unknown as typeof Zotero.ProgressWindow.prototype.show;
    this.show = this.showWithTimer;
    if (options.closeOtherProgressWindows) {
      BasicTool.getZotero().ProgressWindowSet.closeAll();
    }
  }

  /**
   * Create a new line
   * @param options
   * @param options.type
   * @param options.icon
   * @param options.text
   * @param options.progress
   * @param options.idx
   */
  createLine(options: {
    type?: string;
    icon?: string;
    text?: string;
    progress?: number;
    idx?: number;
  }) {
    const icon = this.getIcon(options.type, options.icon);
    const line = new this.ItemProgress(icon || "", options.text || "");
    if (typeof options.progress === "number") {
      line.setProgress(options.progress);
    }
    this.lines.push(line);
    this.updateIcons();
    return this;
  }

  /**
   * Change the line content
   * @param options
   * @param options.type
   * @param options.icon
   * @param options.text
   * @param options.progress
   * @param options.idx
   */
  changeLine(options: {
    type?: string;
    icon?: string;
    text?: string;
    progress?: number;
    idx?: number;
  }) {
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
    if (icon) {
      // @ts-expect-error setItemTypeAndIcon is new func not included in types
      this.lines[idx].setItemTypeAndIcon(icon);
    }
    options.text && this.lines[idx].setText(options.text);
    typeof options.progress === "number" &&
      this.lines[idx].setProgress(options.progress);
    this.updateIcons();
    return this;
  }

  private showWithTimer(closeTime: number | undefined = undefined) {
    this.originalShow();
    typeof closeTime !== "undefined" && (this.closeTime = closeTime);
    if (this.closeTime && this.closeTime > 0) {
      this.startCloseTimer(this.closeTime);
    }
    setTimeout(this.updateIcons.bind(this), 50);
    return this;
  }

  /**
   * Set custom icon uri for progress window
   * @param key
   * @param uri
   */
  static setIconURI(key: string, uri: string) {
    icons[key] = uri;
  }

  private getIcon(type: string | undefined, defaultIcon?: string | undefined) {
    return type && type in icons ? icons[type] : defaultIcon;
  }

  private updateIcons() {
    try {
      this.lines.forEach((line) => {
        const box = (line as any)._image as XUL.Box;
        const icon = box.dataset.itemType;
        if (
          icon &&
          icon.startsWith("chrome://") &&
          !box.style.backgroundImage.includes("progress_arcs")
        ) {
          box.style.backgroundImage = `url(${box.dataset.itemType})`;
        }
      });
    } catch {
      // Ignore
    }
  }
}

declare function _popupWindowShow(
  closeTime?: number | undefined,
): ProgressWindowHelper;
