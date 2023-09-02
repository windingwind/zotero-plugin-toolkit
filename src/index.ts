import { BasicTool, unregister } from "./basic";
import { UITool } from "./tools/ui";
import { ReaderTool } from "./tools/reader";
import { ExtraFieldTool } from "./tools/extraField";
import { ItemTreeManager } from "./managers/itemTree";
import { PromptManager } from "./managers/prompt";
import { LibraryTabPanelManager } from "./managers/libraryTabPanel";
import { ReaderTabPanelManager } from "./managers/readerTabPanel";
import { MenuManager } from "./managers/menu";
import { PreferencePaneManager } from "./managers/preferencePane";
import { ShortcutManager } from "./managers/shortcut";
import { ClipboardHelper } from "./helpers/clipboard";
import { FilePickerHelper } from "./helpers/filePicker";
import { ProgressWindowHelper } from "./helpers/progressWindow";
import { VirtualizedTableHelper } from "./helpers/virtualizedTable";
import { DialogHelper } from "./helpers/dialog";
import { ReaderInstanceManager } from "./managers/readerInstance";
import { FieldHookManager } from "./managers/fieldHook";
import { ItemBoxManager } from "./managers/itemBox";
import { LargePrefHelper } from "./helpers/largePref";

/**
 * ⭐Contains all tools in this lib. Start from here if you are new to this lib.
 * @remarks
 * To minimize your plugin, import the modules you need manually.
 */
class ZoteroToolkit extends BasicTool {
  UI: UITool;
  Reader: ReaderTool;
  ExtraField: ExtraFieldTool;
  FieldHooks: FieldHookManager;
  ItemTree: ItemTreeManager;
  ItemBox: ItemBoxManager;
  Prompt: PromptManager;
  LibraryTabPanel: LibraryTabPanelManager;
  ReaderTabPanel: ReaderTabPanelManager;
  ReaderInstance: ReaderInstanceManager;
  Menu: MenuManager;
  PreferencePane: PreferencePaneManager;
  Shortcut: ShortcutManager;
  Clipboard: typeof ClipboardHelper;
  FilePicker: typeof FilePickerHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  VirtualizedTable: typeof VirtualizedTableHelper;
  Dialog: typeof DialogHelper;
  LargePrefObject: typeof LargePrefHelper;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.Reader = new ReaderTool(this);
    this.ExtraField = new ExtraFieldTool(this);
    this.FieldHooks = new FieldHookManager(this);
    this.ItemTree = new ItemTreeManager(this);
    this.ItemBox = new ItemBoxManager(this);
    this.Prompt = new PromptManager(this);
    this.LibraryTabPanel = new LibraryTabPanelManager(this);
    this.ReaderTabPanel = new ReaderTabPanelManager(this);
    this.ReaderInstance = new ReaderInstanceManager(this);
    this.Menu = new MenuManager(this);
    this.PreferencePane = new PreferencePaneManager(this);
    this.Shortcut = new ShortcutManager(this);
    this.Clipboard = ClipboardHelper;
    this.FilePicker = FilePickerHelper;
    this.ProgressWindow = ProgressWindowHelper;
    this.VirtualizedTable = VirtualizedTableHelper;
    this.Dialog = DialogHelper;
    this.LargePrefObject = LargePrefHelper;
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
