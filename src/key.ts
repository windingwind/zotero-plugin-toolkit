import { ZoteroUI } from "./ui";
import { getGlobal, RegisterToolBase } from "./utils";

/**
 * Shortcut keys APIs.
 * @public
 */
export class ZoteroKeyTool implements RegisterToolBase {
  private uiTool: ZoteroUI;
  constructor() {
    this.uiTool = new ZoteroUI();
  }

  registerCommandset(
    doc: Document,
    id: string,
    commandOptionsList: Command[] = []
  ) {
    doc.querySelector("window").appendChild(
      this.uiTool.creatElementsFromJSON(doc, {
        tag: "commandset",
        namespace: "xul",
        id: id,
        skipIfExists: true,
        subElementOptions: commandOptionsList.map((cmd) => ({
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

  registerCommand(doc: Document, commandOptions: Command) {
    if (commandOptions._parentId) {
      this.registerCommandset(doc, commandOptions._parentId);
    }
    doc.querySelector(`commandset#${commandOptions._parentId}`)?.appendChild(
      this.uiTool.creatElementsFromJSON(doc, {
        tag: "command",
        namespace: "xul",
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

  registerKeyset(doc: Document, id: string, keyOptionsList: Key[] = []) {
    doc.querySelector("window").appendChild(
      this.uiTool.creatElementsFromJSON(doc, {
        tag: "keyset",
        namespace: "xul",
        id: id,
        skipIfExists: true,
        subElementOptions: keyOptionsList.map((key) => ({
          tag: "key",
          id: key.id,
          attributes: {
            oncommand: key.oncommand,
            command: key.command,
            modifiers: key.modifiers,
            key: key.key,
            keycode: key.keycode,
            disabled: key.disabled,
          },
        })),
      })
    );
  }

  registerKey(doc: Document, keyOptions: Key) {
    if (keyOptions._parentId) {
      this.registerKeyset(doc, keyOptions._parentId);
    }
    doc.querySelector(`keyset#${keyOptions._parentId}`)?.appendChild(
      this.uiTool.creatElementsFromJSON(doc, {
        tag: "command",
        namespace: "xul",
        id: keyOptions.id,
        skipIfExists: true,
        attributes: {
          oncommand: keyOptions.oncommand,
          command: keyOptions.command,
          modifiers: keyOptions.modifiers,
          key: keyOptions.key,
          keycode: keyOptions.keycode,
          keytext: keyOptions.keytext,
          disabled: keyOptions.disabled,
        },
      })
    );
    if (keyOptions._commandOptions) {
      this.registerCommand(doc, keyOptions._commandOptions);
    }
  }

  getAllCommands(doc?: Document) {
    return Array.from(
      (doc || getGlobal("document")).querySelectorAll("commandset")
    ).map(
      (cmdset) =>
        ({
          id: cmdset.id,
          commands: Array.from(cmdset.querySelectorAll("command")).map(
            (cmd: XUL.Element) =>
              ({
                id: cmd.id,
                oncommand: cmd.getAttribute("oncommand"),
                disabled: cmd.getAttribute("disabled") === "true",
                label: cmd.getAttribute("label"),
                _parentId: cmdset.id,
              } as Command)
          ),
        } as CommandSet)
    );
  }

  getAllCommandsFlattened(doc?: Document) {
    return Array.prototype.concat(
      ...this.getAllCommands(doc).map((cmdset) => cmdset.commands)
    ) as Command[];
  }

  getAllKeys(
    doc?: Document,
    options: {
      searchCommands?: boolean;
    } = {}
  ) {
    let allCommends: Command[] = [];
    if (options.searchCommands) {
      allCommends = this.getAllCommandsFlattened(doc);
    }
    return Array.from(
      (doc || getGlobal("document")).querySelectorAll("keyset")
    ).map(
      (keysetElem) =>
        ({
          id: keysetElem.id,
          keys: Array.from(keysetElem.querySelectorAll("key")).map(
            (keyElem: XUL.Element) => {
              const key = {
                id: keyElem.id,
                oncommand: keyElem.getAttribute("oncommand"),
                command: keyElem.getAttribute("command"),
                modifiers: keyElem.getAttribute("modifiers"),
                key: keyElem.getAttribute("key"),
                keycode: keyElem.getAttribute("keycode"),
                keytext: keyElem.getAttribute("keytext"),
                disabled: keyElem.getAttribute("disabled") === "true",
                _parentId: keysetElem.id,
              } as Key;
              key._commandOptions = allCommends.find(
                (cmd) => cmd.id === key.command
              );
              return key;
            }
          ),
        } as KeySet)
    );
  }

  getAllKeysFlattened(
    doc?: Document,
    options: {
      searchCommands?: boolean;
    } = {}
  ) {
    return Array.prototype.concat(
      this.getAllKeys(doc, options).map((keyset) => keyset.keys)
    ) as Key[];
  }

  checkKeyConfliction(doc: Document, keyOptions: Key) {
    const mod = new KeyModifier(keyOptions.modifiers || "");
    const allKeys = this.getAllKeysFlattened(doc, { searchCommands: true });
    return allKeys.filter(
      (_keyOption) =>
        _keyOption.id !== keyOptions.id &&
        (_keyOption.key === keyOptions.key ||
          _keyOption.keycode === keyOptions.keycode) &&
        mod.equals(new KeyModifier(_keyOption.modifiers || ""))
    );
  }

  checkAllKeyConfliction(doc: Document) {
    const allKeys = this.getAllKeysFlattened(doc, { searchCommands: true });
    const conflctions: Key[][] = [];
    while (allKeys.length > 0) {
      const checkKey = allKeys.pop();
      const mod = new KeyModifier(checkKey.modifiers || "");
      const conflictKeys = allKeys.filter(
        (_keyOption) =>
          (_keyOption.key === checkKey.key ||
            _keyOption.keycode === checkKey.keycode) &&
          mod.equals(new KeyModifier(_keyOption.modifiers || ""))
      );
      if (conflictKeys.length) {
        conflictKeys.push(checkKey);
        conflctions.push(conflictKeys);
        const conflctionKeyIds = conflictKeys.map((key) => key.id);
        // Find index in allKeys
        const toRemoveIds = [];
        allKeys.forEach(
          (key, i) => conflctionKeyIds.includes(key.id) && toRemoveIds.push(i)
        );
        // Sort toRemoveIds in decrease and remove these keys by id
        toRemoveIds
          .sort((a, b) => b - a)
          .forEach((id) => allKeys.splice(id, 1));
      }
    }
    return conflctions;
  }

  triggerKeyCommand(doc: Document, options: Key | Command) {
    doc
      .querySelector(options.id)
      ?.dispatchEvent(new (getGlobal("Event") as typeof Event)("command"));
  }

  unregister(doc: Document, id: string) {
    doc.querySelector(`#${id}`)?.remove();
  }

  unregisterAll(): void {
    this.uiTool.unregisterAll();
  }
}

export interface KeyModifierStatus {
  accel: boolean;
  shift: boolean;
  control: boolean;
  meta: boolean;
  alt: boolean;
}

export class KeyModifier implements KeyModifierStatus {
  accel: boolean;
  shift: boolean;
  control: boolean;
  meta: boolean;
  alt: boolean;

  constructor(raw: string) {
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

export interface Key {
  id: string;
  command?: string;
  oncommand?: string;
  modifiers?: keyof KeyModifierStatus | string;
  key?: string;
  keycode?: string;
  keytext?: string;
  disabled?: boolean;
  _commandOptions?: Command;
  _parentId: string;
}

export interface Command {
  id: string;
  oncommand?: string;
  disabled?: boolean;
  label?: string;
  _parentId: string;
}

export interface KeySet {
  id: string;
  keys: Key[];
}

export interface CommandSet {
  id: string;
  commands: Command[];
}
