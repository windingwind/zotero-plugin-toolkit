import { BasicTool, makeHelperTool, unregister } from "./basic";
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
import { KeyboardManager } from "./managers/keyboard";
import { PatchHelper } from "./helpers/patch";

/**
 * ⭐Contains all tools in this lib. Start from here if you are new to this lib.
 * @remarks
 * To minimize your plugin, import the modules you need manually.
 */
class ZoteroToolkit extends BasicTool {
  UI = new UITool(this);
  Reader = new ReaderTool(this);
  ExtraField = new ExtraFieldTool(this);
  FieldHooks = new FieldHookManager(this);
  ItemTree = new ItemTreeManager(this);
  ItemBox = new ItemBoxManager(this);
  Keyboard = new KeyboardManager(this);
  Prompt = new PromptManager(this);
  LibraryTabPanel = new LibraryTabPanelManager(this);
  ReaderTabPanel = new ReaderTabPanelManager(this);
  ReaderInstance = new ReaderInstanceManager(this);
  Menu = new MenuManager(this);
  PreferencePane = new PreferencePaneManager(this);
  Shortcut: ShortcutManager = new ShortcutManager(this);
  Clipboard = makeHelperTool(ClipboardHelper, this);
  FilePicker = makeHelperTool(FilePickerHelper, this);
  Patch = makeHelperTool(PatchHelper, this);
  ProgressWindow = makeHelperTool(ProgressWindowHelper, this);
  VirtualizedTable = makeHelperTool(VirtualizedTableHelper, this);
  Dialog = makeHelperTool(DialogHelper, this);
  LargePrefObject = makeHelperTool(LargePrefHelper, this);

  constructor() {
    super();
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
