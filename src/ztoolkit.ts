import {
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
} from "./index.js";

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
