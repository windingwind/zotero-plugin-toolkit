import { BasicTool, makeHelperTool, unregister } from "./basic";
import { UITool } from "./tools/ui";
import { ReaderTool } from "./tools/reader";
import { ExtraFieldTool } from "./tools/extraField";
import { PromptManager } from "./managers/prompt";
import { MenuManager } from "./managers/menu";
import { ClipboardHelper } from "./helpers/clipboard";
import { FilePickerHelper } from "./helpers/filePicker";
import { ProgressWindowHelper } from "./helpers/progressWindow";
import { VirtualizedTableHelper } from "./helpers/virtualizedTable";
import { DialogHelper } from "./helpers/dialog";
import { FieldHookManager } from "./managers/fieldHook";
import { LargePrefHelper } from "./helpers/largePref";
import { KeyboardManager } from "./managers/keyboard";
import { PatchHelper } from "./helpers/patch";
import { GuideHelper } from "./helpers/guide";

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
  Keyboard = new KeyboardManager(this);
  Prompt = new PromptManager(this);
  Menu = new MenuManager(this);
  Clipboard = makeHelperTool(ClipboardHelper, this);
  FilePicker = makeHelperTool(FilePickerHelper, this);
  Patch = makeHelperTool(PatchHelper, this);
  ProgressWindow = makeHelperTool(ProgressWindowHelper, this);
  VirtualizedTable = makeHelperTool(VirtualizedTableHelper, this);
  Dialog = makeHelperTool(DialogHelper, this);
  LargePrefObject = makeHelperTool(LargePrefHelper, this);
  Guide = makeHelperTool(GuideHelper, this);

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
