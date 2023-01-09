import { BasicTool } from "./basic";
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

  constructor() {
    super();
    this.UI = new UITool();
    this.Reader = new ReaderTool();
    this.ExtraField = new ExtraFieldTool();
    this.ItemTree = new ItemTreeManager();
    this.LibraryTabPanel = new LibraryTabPanelManager();
    this.ReaderTabPanel = new ReaderTabPanelManager();
    this.Menu = new MenuManager();
    this.PreferencePane = new PreferencePaneManager();
    this.Shortcut = new ShortcutManager();
    this.Clibpoard = ClibpoardHelper;
    this.FilePicker = FilePickerHelper;
    this.ProgressWindow = ProgressWindowHelper;
  }

  /**
   * Unregister everything created by managers.
   */
  unregisterAll(): void {
    this.ItemTree.unregisterAll();
    this.LibraryTabPanel.unregisterAll();
    this.ReaderTabPanel.unregisterAll();
    this.Menu.unregisterAll();
    this.PreferencePane.unregisterAll();
    this.Shortcut.unregisterAll();
    this.UI.unregisterAll();
  }
}

export default ZoteroToolkit;

export { ZoteroToolkit };
