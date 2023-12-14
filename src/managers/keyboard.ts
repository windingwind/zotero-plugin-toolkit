import { BasicOptions, BasicTool } from "../basic";
import { ManagerTool } from "../basic";
import { waitUntil } from "../utils/wait";

/**
 * Register a global keyboard event listener.
 */
export class KeyboardManager extends ManagerTool {
  private _keyboardCallbacks: Set<KeyboardCallback> = new Set();
  private _cachedKey?: KeyModifier;
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this._ensureAutoUnregisterAll();

    this.addListenerCallback(
      "onMainWindowLoad",
      this.initWindowKeyboardListener
    );
    this.addListenerCallback(
      "onMainWindowUnload",
      this.unInitWindowKeyboardListener
    );

    this.initReaderKeyboardListener();
    for (const win of Zotero.getMainWindows()) {
      this.initWindowKeyboardListener(win);
    }
  }

  /**
   * Register a keyboard event listener.
   * @param callback The callback function.
   */
  register(callback: KeyboardCallback) {
    this._keyboardCallbacks.add(callback);
  }

  /**
   * Unregister a keyboard event listener.
   * @param callback The callback function.
   */
  unregister(callback: KeyboardCallback) {
    this._keyboardCallbacks.delete(callback);
  }

  /**
   * Unregister all keyboard event listeners.
   */
  unregisterAll() {
    this._keyboardCallbacks.clear();
    this.removeListenerCallback(
      "onMainWindowLoad",
      this.initWindowKeyboardListener
    );
    this.removeListenerCallback(
      "onMainWindowUnload",
      this.unInitWindowKeyboardListener
    );
    for (const win of Zotero.getMainWindows()) {
      this.unInitWindowKeyboardListener(win);
    }
  }

  private initWindowKeyboardListener(win: Window) {
    this._initKeyboardListener(win);
  }

  private unInitWindowKeyboardListener(win: Window) {
    this._unInitKeyboardListener(win);
  }

  private initReaderKeyboardListener() {
    Zotero.Reader.registerEventListener(
      "renderToolbar",
      (event) => {
        const reader = event.reader;
        this._initKeyboardListener(reader._iframeWindow);
        waitUntil(
          () => (reader._internalReader?._primaryView as any)?._iframeWindow,
          () =>
            this._initKeyboardListener(
              (reader._internalReader._primaryView as any)?._iframeWindow
            )
        );
      },
      this._basicOptions.api.pluginID
    );
  }

  private _initKeyboardListener(win?: Window) {
    if (!win) {
      return;
    }
    win.addEventListener("keydown", this.savePressedKeys);
    win.addEventListener("keyup", this.triggerCallback);
  }

  private _unInitKeyboardListener(win?: Window) {
    if (!win) {
      return;
    }
    win.removeEventListener("keydown", this.savePressedKeys);
    win.removeEventListener("keyup", this.triggerCallback);
  }

  private savePressedKeys = this._savePressedKeys.bind(this);
  private triggerCallback = this._triggerCallback.bind(this);

  private _savePressedKeys(e: KeyboardEvent) {
    if (!this._cachedKey) {
      this._cachedKey = new KeyModifier(e);
    } else {
      this._cachedKey.merge(new KeyModifier(e), { allowOverwrite: false });
    }
  }

  private async _triggerCallback(e: KeyboardEvent) {
    if (!this._cachedKey) {
      return;
    }

    const currentShortcut = new KeyModifier(this._cachedKey);
    this._cachedKey = undefined;
    this._keyboardCallbacks.forEach((cbk) =>
      cbk(e, {
        keyboard: currentShortcut,
      })
    );
  }
}

type KeyboardCallback = (
  event: KeyboardEvent,
  options: {
    keyboard: KeyModifier;
  }
) => void;

interface KeyModifierStatus {
  accel: boolean;
  shift: boolean;
  control: boolean;
  meta: boolean;
  alt: boolean;
  key: string;
}

/**
 * Class to represent key with modifiers
 */
export class KeyModifier implements KeyModifierStatus {
  accel: boolean = false;
  shift: boolean = false;
  control: boolean = false;
  meta: boolean = false;
  alt: boolean = false;
  key: string = "";

  useAccel: boolean = false;

  constructor(
    raw?: string | KeyboardEvent | KeyModifier,
    options?: { useAccel?: boolean }
  ) {
    this.useAccel = options?.useAccel || false;
    if (typeof raw === "undefined") {
      return;
    } else if (typeof raw === "string") {
      raw = raw || "";
      raw = this.unLocalized(raw);
      this.accel = raw.includes("accel");
      this.shift = raw.includes("shift");
      this.control = raw.includes("control");
      this.meta = raw.includes("meta");
      this.alt = raw.includes("alt");
      // Remove all modifiers, space, comma, and dash
      this.key = raw.replace(/(accel|shift|control|meta|alt| |,|-)/g, "");
    } else if (raw instanceof KeyModifier) {
      this.merge(raw, { allowOverwrite: true });
    } else {
      if (options?.useAccel) {
        if (Zotero.isMac) {
          this.accel = raw.metaKey;
          this.control = raw.ctrlKey;
        } else {
          this.accel = raw.ctrlKey;
          this.meta = raw.metaKey;
        }
      }
      this.shift = raw.shiftKey;
      this.control = raw.ctrlKey;
      this.meta = raw.metaKey;
      this.alt = raw.altKey;
      if (!["Shift", "Meta", "Ctrl", "Alt", "Control"].includes(raw.key)) {
        this.key = raw.key;
      }
    }
  }

  /**
   * Merge another KeyModifier into this one.
   * @param newMod the new KeyModifier
   * @param options
   * @returns
   */
  merge(newMod: KeyModifier, options?: { allowOverwrite?: boolean }) {
    const allowOverwrite = options?.allowOverwrite || false;
    this.mergeAttribute("accel", newMod.accel, allowOverwrite);
    this.mergeAttribute("shift", newMod.shift, allowOverwrite);
    this.mergeAttribute("control", newMod.control, allowOverwrite);
    this.mergeAttribute("meta", newMod.meta, allowOverwrite);
    this.mergeAttribute("alt", newMod.alt, allowOverwrite);
    this.mergeAttribute("key", newMod.key, allowOverwrite);
    return this;
  }

  /**
   * Check if the current KeyModifier equals to another KeyModifier.
   * @param newMod the new KeyModifier
   * @returns true if equals
   */
  equals(newMod: KeyModifier) {
    return (
      this.accel === newMod.accel &&
      this.shift === newMod.shift &&
      this.control === newMod.control &&
      this.meta === newMod.meta &&
      this.alt === newMod.alt &&
      this.key === newMod.key
    );
  }

  /**
   * Get the raw string representation of the KeyModifier.
   */
  getRaw() {
    const enabled = [];
    this.accel && enabled.push("accel");
    this.shift && enabled.push("shift");
    this.control && enabled.push("control");
    this.meta && enabled.push("meta");
    this.alt && enabled.push("alt");
    this.key && enabled.push(this.key);
    return enabled.join(",");
  }

  /**
   * Get the localized string representation of the KeyModifier.
   */
  getLocalized() {
    const raw = this.getRaw();
    if (Zotero.isMac) {
      return raw
        .replaceAll("control", "⌃")
        .replaceAll("alt", "⌥")
        .replaceAll("shift", "⇧")
        .replaceAll("meta", "⌘");
    } else {
      return raw
        .replaceAll("control", "Ctrl")
        .replaceAll("alt", "Alt")
        .replaceAll("shift", "Shift")
        .replaceAll("meta", "Win");
    }
  }

  /**
   * Get the un-localized string representation of the KeyModifier.
   */
  private unLocalized(raw: string) {
    if (Zotero.isMac) {
      return raw
        .replaceAll("⌃", "control")
        .replaceAll("⌥", "alt")
        .replaceAll("⇧", "shift")
        .replaceAll("⌘", "meta");
    } else {
      return raw
        .replaceAll("Ctrl", "control")
        .replaceAll("Alt", "alt")
        .replaceAll("Shift", "shift")
        .replaceAll("Win", "meta");
    }
  }

  private mergeAttribute<T extends keyof this>(
    attribute: T,
    value: this[T],
    allowOverwrite: boolean
  ) {
    if (allowOverwrite || !this[attribute]) {
      this[attribute] = value;
    }
  }
}
