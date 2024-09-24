import { BasicTool, makeHelperTool, unregister } from "./basic.js";
import { UITool } from "./tools/ui.js";
import { ReaderTool } from "./tools/reader.js";
import { ExtraFieldTool } from "./tools/extraField.js";
import { PromptManager } from "./managers/prompt.js";
import { MenuManager } from "./managers/menu.js";
import { ClipboardHelper } from "./helpers/clipboard.js";
import { FilePickerHelper } from "./helpers/filePicker.js";
import { ProgressWindowHelper } from "./helpers/progressWindow.js";
import { VirtualizedTableHelper } from "./helpers/virtualizedTable.js";
import { DialogHelper } from "./helpers/dialog.js";
import { FieldHookManager } from "./managers/fieldHook.js";
import { LargePrefHelper } from "./helpers/largePref.js";
import { KeyboardManager } from "./managers/keyboard.js";
import { PatchHelper } from "./helpers/patch.js";
import { GuideHelper } from "./helpers/guide.js";

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

export {
  ZoteroToolkit,
  BasicTool,
  makeHelperTool,
  unregister,
  UITool,
  ReaderTool,
  ExtraFieldTool,
  PromptManager,
  MenuManager,
  ClipboardHelper,
  FilePickerHelper,
  ProgressWindowHelper,
  VirtualizedTableHelper,
  DialogHelper,
  FieldHookManager,
  LargePrefHelper,
  KeyboardManager,
  PatchHelper,
  GuideHelper,
};
