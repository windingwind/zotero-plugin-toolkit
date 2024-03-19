import { BasicOptions, BasicTool } from "../basic";
import { UITool } from "../tools/ui";
import { ManagerTool } from "../basic";
import ToolkitGlobal, { GlobalInstance } from "./toolkitGlobal";

/**
 * Register shortcut keys.
 * @deprecated Use { @link KeyboardManager} instead.
 */
export class ShortcutManager extends ManagerTool {
  private ui: UITool;
  private globalCache!: ShortcutsGlobal;
  private creatorId: string;
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.ui = new UITool(this);
    this.creatorId = `${Zotero.Utilities.randomString()}-${new Date().getTime()}`;
    this.initializeGlobal();
  }

  /**
   * Register a shortcut key with window.addEventListener("keypress").
   *
   * The callback will not be affected by conflicting.
   * @param type
   * @param keyOptions
   */
  public register(
    type: "event",
    keyOptions: {
      id: string;
      key: string;
      callback: (keyOptions: EventKey) => any;
      modifiers?: string;
      disabled?: boolean;
    }
  ): boolean;
  /**
   * Register a key using XUL element \<key\>.
   *
   * The command might not be triggered if there are conflicting.
   * @param keyOptions
   * @returns `true` for success and `false` for failure.
   */
  public register(
    type: "element",
    keyOptions: {
      id: string;
      key: string;
      modifiers?: keyof KeyModifierStatus;
      disabled?: boolean;
      xulData: {
        document?: Document;
        command?: string;
        oncommand?: string;
        _commandOptions?: {
          id: string;
          document: Document;
          oncommand?: string;
          disabled?: boolean;
          label?: string;
          _parentId: string;
        };
        _parentId: string;
      };
    }
  ): boolean;
  /**
   * Register a Zotero key in preferences.
   *
   * Requires restarting Zotero to take effects.
   * @param type
   * @param keyOptions
   */
  public register(
    type: "prefs",
    keyOptions: {
      id: string;
      key: string;
    }
  ): boolean;
  /**
   * Register a custom key.
   *
   * This is possibly not what you want to use. An API for future extensions.
   * @param type
   * @param keyOptions
   */
  public register(
    type: "custom",
    keyOptions: {
      id: string;
      key: string;
      callback: (keyOptions: CustomKey) => any;
      modifiers?: string;
      register: (keyOptions: CustomKey) => boolean | Promise<boolean>;
      unregister: (keyOptions: CustomKey) => boolean | Promise<boolean>;
    }
  ): Promise<boolean> | boolean;
  public register(type: string, keyOptions: any): Promise<boolean> | boolean {
    const _keyOptions = keyOptions as Key;
    _keyOptions.type = type;
    switch (_keyOptions.type) {
      case "event":
        this.registerEventKey(_keyOptions as EventKey);
        return true;
      case "element":
        this.registerElementKey(_keyOptions as ElementKey);
        return true;
      case "prefs":
        this.getGlobal("Zotero").Prefs.set(
          (_keyOptions as PrefKey).id,
          _keyOptions.key || ""
        );
        return true;
      default:
        try {
          if ((_keyOptions as CustomKey).register) {
            return (_keyOptions as CustomKey).register!(
              _keyOptions as CustomKey
            );
          } else {
            return false;
          }
        } catch (e) {
          this.log(e);
          return false;
        }
    }
  }

  /**
   * Get all shortcuts(element, event, prefs, builtin)
   */
  getAll() {
    return Array.prototype.concat(
      this.getMainWindowElementKeys(),
      this.getEventKeys(),
      this.getPrefsKeys(),
      this.getBuiltinKeys()
    ) as Key[];
  }

  /**
   * Check key conflicting of `inputKeyOptions`.
   * @param inputKeyOptions
   * @param options
   * @returns conflicting keys array
   */
  checkKeyConflicting(
    inputKeyOptions: Key,
    options: {
      customKeys?: CustomKey[];
      includeEmpty?: boolean;
    } = { includeEmpty: false, customKeys: [] }
  ) {
    inputKeyOptions.modifiers = new KeyModifier(
      inputKeyOptions.modifiers || ""
    ).getRaw();
    let allKeys = this.getAll();
    if (options.customKeys?.length) {
      allKeys = allKeys.concat(options.customKeys);
    }
    if (!options.includeEmpty) {
      allKeys = allKeys.filter((_keyOptions) => _keyOptions.key);
    }
    return allKeys.filter(
      (_keyOptions) =>
        _keyOptions.id !== inputKeyOptions.id &&
        _keyOptions.key?.toLowerCase() === inputKeyOptions.key?.toLowerCase() &&
        _keyOptions.modifiers === inputKeyOptions.modifiers
    );
  }

  /**
   * Find all key conflicting.
   * @param options
   * @returns An array of conflicting keys arrays. Same conflicting keys are put together.
   */
  checkAllKeyConflicting(
    options: {
      customKeys?: CustomKey[];
      includeEmpty: boolean;
    } = { includeEmpty: false, customKeys: [] }
  ) {
    let allKeys = this.getAll();
    if (options.customKeys?.length) {
      allKeys = allKeys.concat(options.customKeys);
    }
    if (!options.includeEmpty) {
      allKeys = allKeys.filter((_keyOptions) => _keyOptions.key);
    }
    const conflicting: Key[][] = [];
    while (allKeys.length > 0) {
      const checkKey = allKeys.pop()!;
      const conflictKeys = allKeys.filter(
        (_keyOptions) =>
          _keyOptions.key?.toLowerCase() === checkKey.key?.toLowerCase() &&
          _keyOptions.modifiers === checkKey.modifiers
      );
      if (conflictKeys.length) {
        conflictKeys.push(checkKey);
        conflicting.push(conflictKeys);
        const conflictingKeyIds = conflictKeys.map((key) => key.id);
        // Find index in allKeys
        const toRemoveIds: number[] = [];
        allKeys.forEach(
          (key, i) => conflictingKeyIds.includes(key.id) && toRemoveIds.push(i)
        );
        // Sort toRemoveIds in decrease and remove these keys by id
        toRemoveIds
          .sort((a, b) => b - a)
          .forEach((id) => allKeys.splice(id, 1));
      }
    }
    return conflicting;
  }

  /**
   * Unregister a key.
   * @remarks
   * `builtin` keys cannot be unregistered.
   * @param keyOptions
   * @returns `true` for success and `false` for failure.
   */
  async unregister(keyOptions: Key) {
    switch (keyOptions.type) {
      case "element":
        (
          (keyOptions as ElementKey).xulData.document ||
          this.getGlobal("document")
        )
          .querySelector(`#${keyOptions.id}`)
          ?.remove();
        return true;
      case "prefs":
        this.getGlobal("Zotero").Prefs.set((keyOptions as PrefKey).id, "");
        return true;
      case "builtin":
        return false;
      case "event":
        let idx = this.globalCache.eventKeys.findIndex(
          (currentKey) => currentKey.id === keyOptions.id
        );
        while (idx >= 0) {
          this.globalCache.eventKeys.splice(idx, 1);
          idx = this.globalCache.eventKeys.findIndex(
            (currentKey) => currentKey.id === keyOptions.id
          );
        }
        return true;
      default:
        try {
          if ((keyOptions as CustomKey).unregister) {
            return await (keyOptions as CustomKey).unregister!(
              keyOptions as CustomKey
            );
          } else {
            return false;
          }
        } catch (e) {
          this.log(e);
          return false;
        }
    }
  }

  /**
   * Unregister all keys created by this instance.
   */
  unregisterAll(): void {
    // Unregister element keys
    this.ui.unregisterAll();
    // Unregister event keys
    this.globalCache.eventKeys
      .filter((keyOptions) => keyOptions.creatorId === this.creatorId)
      .forEach((keyOptions) => this.unregister(keyOptions));
  }

  private initializeGlobal() {
    const Zotero = this.getGlobal("Zotero");
    const window = this.getGlobal("window");

    this.globalCache = ToolkitGlobal.getInstance().shortcut;
    if (!this.globalCache._ready) {
      this.globalCache._ready = true;
      window.addEventListener("keypress", (event) => {
        let eventMods = [];
        let eventModsWithAccel = [];
        if (event.altKey) {
          eventMods.push("alt");
          eventModsWithAccel.push("alt");
        }
        if (event.shiftKey) {
          eventMods.push("shift");
          eventModsWithAccel.push("shift");
        }
        if (event.metaKey) {
          eventMods.push("meta");
          Zotero.isMac && eventModsWithAccel.push("accel");
        }
        if (event.ctrlKey) {
          eventMods.push("control");
          !Zotero.isMac && eventModsWithAccel.push("accel");
        }
        const eventModStr = new KeyModifier(eventMods.join(",")).getRaw();
        const eventModStrWithAccel = new KeyModifier(
          eventMods.join(",")
        ).getRaw();
        this.globalCache.eventKeys.forEach((keyOptions: BaseKey) => {
          if (keyOptions.disabled) {
            return;
          }
          const modStr = new KeyModifier(keyOptions.modifiers || "").getRaw();
          if (
            (modStr === eventModStr || modStr === eventModStrWithAccel) &&
            keyOptions.key?.toLowerCase() === event.key.toLowerCase()
          ) {
            keyOptions.callback();
          }
        });
      });
    }
  }

  private registerEventKey(keyOptions: EventKey) {
    keyOptions.creatorId = this.creatorId;
    this.globalCache.eventKeys.push(keyOptions);
  }

  /**
   * Register Element \<commandset\>. In general, use `registerElementKey` or `registerKey`.
   * @param commandSetOptions
   */
  private registerElementCommandset(commandSetOptions: ElementCommandSet) {
    commandSetOptions.document.querySelector("window")?.appendChild(
      this.ui.createElement(commandSetOptions.document, "commandset", {
        id: commandSetOptions.id,
        skipIfExists: true,
        children: commandSetOptions.commands.map((cmd) => ({
          tag: "command",
          id: cmd.id,
          attributes: {
            oncommand: cmd.oncommand,
            disabled: cmd.disabled,
            label: cmd.label,
          },
        })),
      })
    );
  }

  /**
   * Register Element \<command\>. In general, use `registerElementKey` or `registerKey`.
   * @param commandOptions
   */
  private registerElementCommand(commandOptions: ElementCommand) {
    if (commandOptions._parentId) {
      this.registerElementCommandset({
        id: commandOptions._parentId,
        document: commandOptions.document,
        commands: [],
      });
    }
    commandOptions.document
      .querySelector(`commandset#${commandOptions._parentId}`)
      ?.appendChild(
        this.ui.createElement(commandOptions.document, "command", {
          id: commandOptions.id,
          skipIfExists: true,
          attributes: {
            oncommand: commandOptions.oncommand,
            disabled: commandOptions.disabled,
            label: commandOptions.label,
          },
        })
      );
  }

  /**
   * Register Element \<keyset\>. In general, use `registerElementKey` or `registerKey`.
   * @param keySetOptions
   */
  private registerElementKeyset(keySetOptions: ElementKeySet) {
    keySetOptions.document.querySelector("window")?.appendChild(
      this.ui.createElement(keySetOptions.document, "keyset", {
        id: keySetOptions.id,
        skipIfExists: true,
        children: keySetOptions.keys.map((keyOptions) => ({
          tag: "key",
          id: keyOptions.id,
          attributes: {
            oncommand: keyOptions.xulData.oncommand || "//",
            command: keyOptions.xulData.command,
            modifiers: keyOptions.modifiers,
            key: this.getXULKey(keyOptions.key),
            keycode: this.getXULKeyCode(keyOptions.key),
            disabled: keyOptions.disabled,
          },
        })),
      })
    );
  }

  /**
   * Register a shortcut key element \<key\>.
   * @remarks
   * Provide `_parentId` to register a \<keyset\>;
   *
   * Provide `_commandOptions` to register a \<command\>;
   *
   * Provide `_parentId` in `_commandOptions` to register a \<commandset\>.
   *
   * See examples for more details.
   * @param keyOptions
   * @example
   */
  private registerElementKey(keyOptions: ElementKey) {
    const doc = keyOptions.xulData.document || this.getGlobal("document");
    if (keyOptions.xulData._parentId) {
      this.registerElementKeyset({
        id: keyOptions.xulData._parentId,
        document: doc,
        keys: [],
      });
    }
    doc.querySelector(`keyset#${keyOptions.xulData._parentId}`)?.appendChild(
      this.ui.createElement(doc, "key", {
        id: keyOptions.id,
        skipIfExists: true,
        attributes: {
          oncommand: keyOptions.xulData.oncommand || "//",
          command: keyOptions.xulData.command,
          modifiers: keyOptions.modifiers,
          key: this.getXULKey(keyOptions.key),
          keycode: this.getXULKeyCode(keyOptions.key),
          disabled: keyOptions.disabled,
        },
      })
    );
    if (keyOptions.xulData._commandOptions) {
      this.registerElementCommand(keyOptions.xulData._commandOptions);
    }
  }

  private getXULKey<
    K extends keyof typeof XUL_KEYCODE_MAPS,
    V extends `${XUL_KEYCODE_MAPS}`
  >(standardKey: V): undefined;
  private getXULKey(standardKey: string | null | undefined): string | undefined;
  private getXULKey(standardKey: string) {
    if (standardKey.length === 1) {
      return standardKey;
    }
    return undefined;
  }

  private getXULKeyCode<
    K extends keyof typeof XUL_KEYCODE_MAPS,
    V extends `${XUL_KEYCODE_MAPS}`
  >(standardKey: V): K;
  private getXULKeyCode(standardKey: string | null | undefined): undefined;
  private getXULKeyCode(standardKey: string) {
    const idx = Object.values(XUL_KEYCODE_MAPS).findIndex(
      (value) => value === standardKey
    );
    if (idx >= 0) {
      return Object.values(XUL_KEYCODE_MAPS)[idx];
    }
    return undefined;
  }

  private getStandardKey<
    K extends keyof typeof XUL_KEYCODE_MAPS,
    V extends `${XUL_KEYCODE_MAPS}`
  >(XULKey: string, XULKeyCode: K): V;
  private getStandardKey(
    XULKey: string | null | undefined,
    XULKeyCode: string | null | undefined
  ): string | undefined;
  private getStandardKey(XULKey: string, XULKeyCode: string) {
    if (XULKeyCode && Object.keys(XUL_KEYCODE_MAPS).includes(XULKeyCode)) {
      return XUL_KEYCODE_MAPS[XULKeyCode as keyof typeof XUL_KEYCODE_MAPS];
    } else {
      return XULKey;
    }
  }

  /**
   * Get all \<commandset\> details.
   * @param doc
   */
  private getElementCommandSets(doc?: Document) {
    return Array.from(
      (doc || this.getGlobal("document")).querySelectorAll("commandset")
    ).map(
      (cmdSet) =>
        ({
          id: cmdSet.id,
          commands: (
            Array.from(cmdSet.querySelectorAll("command")) as XUL.Command[]
          ).map(
            (cmd) =>
              ({
                id: cmd.id,
                oncommand: cmd.getAttribute("oncommand"),
                disabled: cmd.getAttribute("disabled") === "true",
                label: cmd.getAttribute("label"),
                _parentId: cmdSet.id,
              } as ElementCommand)
          ),
        } as ElementCommandSet)
    );
  }

  /**
   * Get all \<command\> details.
   * @param doc
   */
  private getElementCommands(doc?: Document) {
    return Array.prototype.concat(
      ...this.getElementCommandSets(doc).map((cmdSet) => cmdSet.commands)
    ) as ElementCommand[];
  }

  /**
   * Get all \<keyset\> details.
   * @param doc
   * @param options
   */
  private getElementKeySets(doc?: Document) {
    let allCommends = this.getElementCommands(doc);
    return Array.from(
      (doc || this.getGlobal("document")).querySelectorAll("keyset")
    ).map(
      (keysetElem) =>
        ({
          id: keysetElem.id,
          document: doc,
          keys: (
            Array.from(keysetElem.querySelectorAll("key")) as XUL.Element[]
          ).map((keyElem) => {
            const oncommand = keyElem.getAttribute("oncommand") || "";
            const commandId = keyElem.getAttribute("command") || "";
            const commandOptions = allCommends.find(
              (cmd) => cmd.id === commandId
            );
            const key = {
              type: "element",
              id: keyElem.id,
              key: this.getStandardKey(
                keyElem.getAttribute("key") || "",
                keyElem.getAttribute("keycode") || ""
              ),
              modifiers: new KeyModifier(
                keyElem.getAttribute("modifiers") || ""
              ).getRaw(),
              disabled: keyElem.getAttribute("disabled") === "true",
              xulData: {
                document: doc,
                oncommand: oncommand,
                command: commandId,
                _parentId: keysetElem.id,
                _commandOptions: commandOptions,
              },
              callback: () => {
                const win = (doc as any).ownerGlobal as Window;
                const _eval = (win as any).eval;
                _eval(oncommand);
                _eval(commandOptions?.oncommand || "");
              },
            } as ElementKey;
            return key;
          }),
        } as ElementKeySet)
    );
  }

  /**
   * Get all \<key\> details.
   * @param doc
   * @param options
   */
  private getElementKeys(doc?: Document) {
    return Array.prototype
      .concat(...this.getElementKeySets(doc).map((keyset) => keyset.keys))
      .filter(
        (elemKey) => !ELEM_KEY_IGNORE.includes((elemKey as ElementKey).id)
      ) as ElementKey[];
  }

  /**
   * Get \<key\> details in main window.
   * @param options
   */
  private getMainWindowElementKeys() {
    return this.getElementKeys(this.getGlobal("document"));
  }

  private getEventKeys() {
    return this.globalCache.eventKeys;
  }

  /**
   * Get Zotero builtin keys defined in preferences.
   */
  private getPrefsKeys() {
    const Zotero = this.getGlobal("Zotero");
    return PREF_KEYS.map(
      (pref) =>
        ({
          id: pref.id,
          modifiers: pref.modifiers,
          key: Zotero.Prefs.get(pref.id),
          callback: pref.callback,
          type: "prefs",
        } as PrefKey)
    );
  }

  /**
   * Get Zotero builtin keys not defined in preferences.
   */
  private getBuiltinKeys() {
    return BUILTIN_KEYS.map(
      (builtin) =>
        ({
          id: builtin.id,
          modifiers: builtin.modifiers,
          key: builtin.key,
          callback: builtin.callback,
          type: "builtin",
        } as BuiltinKey)
    );
  }
}

interface KeyModifierStatus {
  accel: boolean;
  shift: boolean;
  control: boolean;
  meta: boolean;
  alt: boolean;
}

class KeyModifier implements KeyModifierStatus {
  accel: boolean;
  shift: boolean;
  control: boolean;
  meta: boolean;
  alt: boolean;

  constructor(raw: string) {
    raw = raw || "";
    this.accel = raw.includes("accel");
    this.shift = raw.includes("shift");
    this.control = raw.includes("control");
    this.meta = raw.includes("meta");
    this.alt = raw.includes("alt");
  }

  equals(newMod: KeyModifier) {
    this.accel === newMod.accel;
    this.shift === newMod.shift;
    this.control === newMod.control;
    this.meta === newMod.meta;
    this.alt === newMod.alt;
  }

  getRaw() {
    const enabled = [];
    this.accel && enabled.push("accel");
    this.shift && enabled.push("shift");
    this.control && enabled.push("control");
    this.meta && enabled.push("meta");
    this.alt && enabled.push("alt");
    return enabled.join(",");
  }
}

export interface ShortcutsGlobal extends GlobalInstance {
  eventKeys: EventKey[];
}

interface BaseKey {
  id: string;
  modifiers?: keyof KeyModifierStatus | string;
  key?: string;
  type: string;
  disabled?: boolean;
  callback: () => any;
}

interface EventKey extends BaseKey {
  type: "event";
  creatorId: string;
}

interface ElementKey extends BaseKey {
  type: "element";
  xulData: {
    document: Document;
    command?: string;
    oncommand?: string;
    _commandOptions?: ElementCommand;
    _parentId: string;
  };
}

interface PrefKey extends BaseKey {
  type: "prefs";
}

interface BuiltinKey extends BaseKey {
  type: "builtin";
  disabled?: false;
}

interface CustomKey extends BaseKey {
  register?: (keyOptions: CustomKey) => boolean | Promise<boolean>;
  unregister?: (keyOptions: CustomKey) => boolean | Promise<boolean>;
}

type Key = EventKey | ElementKey | PrefKey | BuiltinKey | CustomKey;

interface ElementCommand {
  id: string;
  document: Document;
  oncommand?: string;
  disabled?: boolean;
  label?: string;
  _parentId: string;
}

interface ElementKeySet {
  id: string;
  document: Document;
  keys: ElementKey[];
}

interface ElementCommandSet {
  id: string;
  document: Document;
  commands: ElementCommand[];
}

enum XUL_KEYCODE_MAPS {
  VK_CANCEL = "Unidentified",
  VK_BACK = "Backspace",
  VK_TAB = "Tab",
  VK_CLEAR = "Clear",
  VK_RETURN = "Enter",
  VK_ENTER = "Enter",
  VK_SHIFT = "Shift",
  VK_CONTROL = "Control",
  VK_ALT = "Alt",
  VK_PAUSE = "Pause",
  VK_CAPS_LOCK = "CapsLock",
  VK_ESCAPE = "Escape",
  VK_SPACE = " ",
  VK_PAGE_UP = "PageUp",
  VK_PAGE_DOWN = "PageDown",
  VK_END = "End",
  VK_HOME = "Home",
  VK_LEFT = "ArrowLeft",
  VK_UP = "ArrowUp",
  VK_RIGHT = "ArrowRight",
  VK_DOWN = "ArrowDown",
  VK_PRINTSCREEN = "PrintScreen",
  VK_INSERT = "Insert",
  VK_DELETE = "Backspace",
  VK_0 = "0",
  VK_1 = "1",
  VK_2 = "2",
  VK_3 = "3",
  VK_4 = "4",
  VK_5 = "5",
  VK_6 = "6",
  VK_7 = "7",
  VK_8 = "8",
  VK_9 = "9",
  VK_A = "A",
  VK_B = "B",
  VK_C = "C",
  VK_D = "D",
  VK_E = "E",
  VK_F = "F",
  VK_G = "G",
  VK_H = "H",
  VK_I = "I",
  VK_J = "J",
  VK_K = "K",
  VK_L = "L",
  VK_M = "M",
  VK_N = "N",
  VK_O = "O",
  VK_P = "P",
  VK_Q = "Q",
  VK_R = "R",
  VK_S = "S",
  VK_T = "T",
  VK_U = "U",
  VK_V = "V",
  VK_W = "W",
  VK_X = "X",
  VK_Y = "Y",
  VK_Z = "Z",
  VK_SEMICOLON = "Unidentified",
  VK_EQUALS = "Unidentified",
  VK_NUMPAD0 = "0",
  VK_NUMPAD1 = "1",
  VK_NUMPAD2 = "2",
  VK_NUMPAD3 = "3",
  VK_NUMPAD4 = "4",
  VK_NUMPAD5 = "5",
  VK_NUMPAD6 = "6",
  VK_NUMPAD7 = "7",
  VK_NUMPAD8 = "8",
  VK_NUMPAD9 = "9",
  VK_MULTIPLY = "Multiply",
  VK_ADD = "Add",
  VK_SEPARATOR = "Separator",
  VK_SUBTRACT = "Subtract",
  VK_DECIMAL = "Decimal",
  VK_DIVIDE = "Divide",
  VK_F1 = "F1",
  VK_F2 = "F2",
  VK_F3 = "F3",
  VK_F4 = "F4",
  VK_F5 = "F5",
  VK_F6 = "F6",
  VK_F7 = "F7",
  VK_F8 = "F8",
  VK_F9 = "F9",
  VK_F10 = "F10",
  VK_F11 = "F11",
  VK_F12 = "F12",
  VK_F13 = "F13",
  VK_F14 = "F14",
  VK_F15 = "F15",
  VK_F16 = "F16",
  VK_F17 = "F17",
  VK_F18 = "F18",
  VK_F19 = "F19",
  VK_F20 = "F20",
  VK_F21 = "Soft1",
  VK_F22 = "Soft2",
  VK_F23 = "Soft3",
  VK_F24 = "Soft4",
  VK_NUM_LOCK = "NumLock",
  VK_SCROLL_LOCK = "ScrollLock",
  VK_COMMA = ",",
  VK_PERIOD = ".",
  VK_SLASH = "Divide",
  VK_BACK_QUOTE = "`",
  VK_OPEN_BRACKET = "[",
  VK_CLOSE_BRACKET = "]",
  VK_QUOTE = "\\",
  VK_HELP = "Help",
}

function getElementKeyCallback(keyId: string) {
  return function () {
    const win = BasicTool.getZotero().getMainWindow();
    const keyElem = win.document.querySelector(`#${keyId}`);
    if (!keyElem) {
      return function () {};
    }
    const _eval = (win as any).eval;
    _eval(keyElem.getAttribute("oncommand") || "//");
    const cmdId = keyElem.getAttribute("command");
    if (!cmdId) {
      return;
    }
    _eval(
      win.document.querySelector(`#${cmdId}`)?.getAttribute("oncommand") || "//"
    );
  };
}

function getBuiltinEventKeyCallback(eventId: string) {
  return function () {
    const Zotero = BasicTool.getZotero();
    const ZoteroPane = Zotero.getActiveZoteroPane();
    ZoteroPane.handleKeyPress({
      metaKey: true,
      ctrlKey: true,
      shiftKey: true,
      originalTarget: { id: "" },
      preventDefault: () => {},
      key: Zotero.Prefs.get(`extensions.zotero.keys.${eventId}`, true),
    });
  };
}

const ELEM_KEY_IGNORE = ["key_copyCitation", "key_copyBibliography"];

const PREF_KEYS = [
  {
    id: "extensions.zotero.keys.copySelectedItemCitationsToClipboard",
    modifiers: "accel,shift",
    elemId: "key_copyCitation",
    callback: getElementKeyCallback("key_copyCitation"),
  },
  {
    id: "extensions.zotero.keys.copySelectedItemsToClipboard",
    modifiers: "accel,shift",
    elemId: "key_copyBibliography",
    callback: getElementKeyCallback("key_copyBibliography"),
  },
  {
    id: "extensions.zotero.keys.library",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("library"),
  },
  {
    id: "extensions.zotero.keys.newItem",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("newItem"),
  },
  {
    id: "extensions.zotero.keys.newNote",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("newNote"),
  },
  {
    id: "extensions.zotero.keys.quicksearch",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("quicksearch"),
  },
  {
    id: "extensions.zotero.keys.saveToZotero",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("saveToZotero"),
  },
  {
    id: "extensions.zotero.keys.sync",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("sync"),
  },
  {
    id: "extensions.zotero.keys.toggleAllRead",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("toggleAllRead"),
  },
  {
    id: "extensions.zotero.keys.toggleRead",
    modifiers: "accel,shift",
    callback: getBuiltinEventKeyCallback("toggleRead"),
  },
];

const BUILTIN_KEYS = [
  {
    id: "showItemCollection",
    modifiers: "",
    key: "Ctrl",
    callback: () => {
      const Zotero = BasicTool.getZotero();
      const ZoteroPane = Zotero.getActiveZoteroPane();
      ZoteroPane.handleKeyUp({
        originalTarget: {
          id: ZoteroPane.itemsView ? ZoteroPane.itemsView.id : "",
        },
        keyCode: Zotero.isWin ? 17 : 18,
      });
    },
  },
  {
    id: "closeSelectedTab",
    modifiers: "accel",
    key: "W",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      if (ztabs.selectedIndex > 0) {
        ztabs.close("");
      }
    },
  },
  {
    id: "undoCloseTab",
    modifiers: "accel,shift",
    key: "T",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.undoClose();
    },
  },
  {
    id: "selectNextTab",
    modifiers: "control",
    key: "Tab",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.selectPrev();
    },
  },
  {
    id: "selectPreviousTab",
    modifiers: "control,shift",
    key: "Tab",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.selectNext();
    },
  },
  {
    id: "selectTab1",
    modifiers: "accel",
    key: "1",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(0);
    },
  },
  {
    id: "selectTab2",
    modifiers: "accel",
    key: "2",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(1);
    },
  },
  {
    id: "selectTab3",
    modifiers: "accel",
    key: "3",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(2);
    },
  },
  {
    id: "selectTab4",
    modifiers: "accel",
    key: "4",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(3);
    },
  },
  {
    id: "selectTab5",
    modifiers: "accel",
    key: "5",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(4);
    },
  },
  {
    id: "selectTab6",
    modifiers: "accel",
    key: "6",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(5);
    },
  },
  {
    id: "selectTab7",
    modifiers: "accel",
    key: "7",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(6);
    },
  },
  {
    id: "selectTab8",
    modifiers: "accel",
    key: "8",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.jump(7);
    },
  },
  {
    id: "selectTabLast",
    modifiers: "accel",
    key: "9",
    callback: () => {
      const ztabs = (BasicTool.getZotero().getMainWindow() as any)
        .Zotero_Tabs as typeof Zotero_Tabs;
      ztabs.selectLast();
    },
  },
];
