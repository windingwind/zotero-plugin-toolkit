import { BasicTool, unregister } from "./basic";
import { UITool } from "./tools/ui";
import { ReaderTool } from "./tools/reader";
import { ExtraFieldTool } from "./tools/extraField";
import { ItemTreeManager } from "./managers/itemTree";
import { LibraryTabPanelManager } from "./managers/libraryTabPanel";
import { ReaderTabPanelManager } from "./managers/readerTabPanel";
import { MenuManager } from "./managers/menu";
import { PreferencePaneManager } from "./managers/preferencePane";
import { ShortcutManager } from "./managers/shortcut";
import { ClibpoardHelper } from "./helpers/clipboard";
import { FilePickerHelper } from "./helpers/filePicker";
import { ProgressWindowHelper } from "./helpers/progressWindow";
import { VirtualizedTableHelper } from "./helpers/virtualizedTable";
import { DialogHelper } from "./_doc";

/**
 * ⭐Contains all tools in this lib. Start from here if you are new to this lib.
 * @remarks
 * To minimize your plugin, import the modules you need manually.
 */
class ZoteroToolkit extends BasicTool {
  UI: UITool;
  Reader: ReaderTool;
  ExtraField: ExtraFieldTool;
  ItemTree: ItemTreeManager;
  LibraryTabPanel: LibraryTabPanelManager;
  ReaderTabPanel: ReaderTabPanelManager;
  Menu: MenuManager;
  PreferencePane: PreferencePaneManager;
  Shortcut: ShortcutManager;
  Clibpoard: typeof ClibpoardHelper;
  FilePicker: typeof FilePickerHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  VirtualizedTabel: typeof VirtualizedTableHelper;
  Dialog: typeof DialogHelper;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.Reader = new ReaderTool(this);
    this.ExtraField = new ExtraFieldTool(this);
    this.ItemTree = new ItemTreeManager(this);
    this.LibraryTabPanel = new LibraryTabPanelManager(this);
    this.ReaderTabPanel = new ReaderTabPanelManager(this);
    this.Menu = new MenuManager(this);
    this.PreferencePane = new PreferencePaneManager(this);
    this.Shortcut = new ShortcutManager(this);
    this.Clibpoard = ClibpoardHelper;
    this.FilePicker = FilePickerHelper;
    this.ProgressWindow = ProgressWindowHelper;
    this.VirtualizedTabel = VirtualizedTableHelper;
    this.Dialog = DialogHelper;
  }

  /**
   * Unregister everything created by managers.
   */
  unregisterAll(): void {
    unregister(this);
  }
}

export default ZoteroToolkit;

export { ZoteroToolkit };
