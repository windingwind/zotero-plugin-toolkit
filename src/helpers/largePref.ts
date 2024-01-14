import { BasicTool } from "../basic";

/**
 * Helper class for storing large amounts of data in Zotero preferences.
 *
 * @remarks
 * The allowed data length for a single preference is at least 100k,
 * but if this can grow infinitely, like an Array or an Object,
 * there will be significant performance problems.
 *
 * This class stores the keys of data in a single preference as a JSON string of Array,
 * and stores the values of data in separate preferences.
 *
 * You can either use the class as a normal object with `asObject()`,
 * or use the methods to access the data.
 */
export class LargePrefHelper extends BasicTool {
  private keyPref: string;
  private valuePrefPrefix: string;
  private innerObj: Record<string, string>;

  private hooks: HooksType;

  /**
   *
   * @param keyPref The preference name for storing the keys of the data.
   * @param valuePrefPrefix The preference name prefix for storing the values of the data.
   * @param hooks Hooks for parsing the values of the data.
   * - `afterGetValue`: A function that takes the value of the data as input and returns the parsed value.
   * - `beforeSetValue`: A function that takes the key and value of the data as input and returns the parsed key and value.
   * If `hooks` is `"default"`, no parsing will be done.
   * If `hooks` is `"parser"`, the values will be parsed as JSON.
   * If `hooks` is an object, the values will be parsed by the hooks.
   */
  constructor(
    keyPref: string,
    valuePrefPrefix: string,
    hooks: Partial<typeof defaultHooks> | "default" | "parser" = "default"
  ) {
    super();
    this.keyPref = keyPref;
    this.valuePrefPrefix = valuePrefPrefix;
    if (hooks === "default") {
      this.hooks = defaultHooks;
    } else if (hooks === "parser") {
      this.hooks = parserHooks;
    } else {
      this.hooks = { ...defaultHooks, ...hooks };
    }
    this.innerObj = {};
  }

  /**
   * Get the object that stores the data.
   * @returns The object that stores the data.
   */
  public asObject(): ProxyObj {
    return this.constructTempObj();
  }

  /**
   * Get the Map that stores the data.
   * @returns The Map that stores the data.
   */
  public asMapLike(): Map<string, any> {
    const mapLike = {
      get: (key: string) => this.getValue(key),
      set: (key: string, value: any) => {
        this.setValue(key, value);
        return mapLike;
      },
      has: (key: string) => this.hasKey(key),
      delete: (key: string) => this.deleteKey(key),
      clear: () => {
        for (const key of this.getKeys()) {
          this.deleteKey(key);
        }
      },
      forEach: (
        callback: (value: any, key: string, map: Map<string, any>) => void
      ) => {
        return this.constructTempMap().forEach(callback);
      },
      get size() {
        return this._this.getKeys().length;
      },
      entries: () => {
        return this.constructTempMap().values();
      },
      keys: () => {
        const keys = this.getKeys();
        return keys[Symbol.iterator]();
      },
      values: () => {
        return this.constructTempMap().values();
      },
      [Symbol.iterator]: () => {
        return this.constructTempMap()[Symbol.iterator]();
      },
      [Symbol.toStringTag]: "MapLike",
      _this: this,
    };
    return mapLike;
  }

  /**
   * Get the keys of the data.
   * @returns The keys of the data.
   */
  public getKeys() {
    const rawKeys = Zotero.Prefs.get(this.keyPref, true) as string;
    const keys: string[] = rawKeys ? JSON.parse(rawKeys) : [];
    for (const key of keys) {
      const value = "placeholder";
      this.innerObj[key] = value;
    }
    return keys;
  }

  /**
   * Set the keys of the data.
   * @param keys The keys of the data.
   */
  public setKeys(keys: string[]) {
    keys = [...new Set(keys.filter((key) => key))];
    Zotero.Prefs.set(this.keyPref, JSON.stringify(keys), true);
    for (const key of keys) {
      const value = "placeholder";
      this.innerObj[key] = value;
    }
  }

  /**
   * Get the value of a key.
   * @param key The key of the data.
   * @returns The value of the key.
   */
  public getValue(key: string) {
    const value = Zotero.Prefs.get(`${this.valuePrefPrefix}${key}`, true) as
      | string
      | undefined;
    if (typeof value === "undefined") {
      return;
    }
    let { value: newValue } = this.hooks.afterGetValue({ value });
    this.innerObj[key] = newValue;
    return newValue;
  }

  /**
   * Set the value of a key.
   * @param key The key of the data.
   * @param value The value of the key.
   */
  public setValue(key: string, value: any) {
    let { key: newKey, value: newValue } = this.hooks.beforeSetValue({
      key,
      value,
    });
    this.setKey(newKey);
    Zotero.Prefs.set(`${this.valuePrefPrefix}${newKey}`, newValue, true);
    this.innerObj[newKey] = newValue;
  }

  /**
   * Check if a key exists.
   * @param key The key of the data.
   * @returns Whether the key exists.
   */
  public hasKey(key: string) {
    return this.getKeys().includes(key);
  }

  /**
   * Add a key.
   * @param key The key of the data.
   */
  public setKey(key: string) {
    const keys = this.getKeys();
    if (!keys.includes(key)) {
      keys.push(key);
      // Obj is updated here
      this.setKeys(keys);
    }
  }

  /**
   * Delete a key.
   * @param key The key of the data.
   */
  public deleteKey(key: string) {
    const keys = this.getKeys();
    const index = keys.indexOf(key);
    if (index > -1) {
      keys.splice(index, 1);
      delete this.innerObj[key];
      // Obj is updated here
      this.setKeys(keys);
    }
    Zotero.Prefs.clear(`${this.valuePrefPrefix}${key}`, true);
    return true;
  }

  private constructTempObj() {
    return new Proxy(this.innerObj, {
      get: (target, prop, receiver) => {
        this.getKeys();
        if (typeof prop === "string" && prop in target) {
          this.getValue(prop);
        }
        return Reflect.get(target, prop, receiver);
      },
      set: (target, p, newValue, receiver) => {
        if (typeof p === "string") {
          if (newValue === undefined) {
            this.deleteKey(p);
            return true;
          }
          this.setValue(p, newValue);
          return true;
        }
        return Reflect.set(target, p, newValue, receiver);
      },
      has: (target, p) => {
        this.getKeys();
        return Reflect.has(target, p);
      },
      deleteProperty: (target, p) => {
        if (typeof p === "string") {
          this.deleteKey(p);
          return true;
        }
        return Reflect.deleteProperty(target, p);
      },
    });
  }

  private constructTempMap(): Map<string, any> {
    const map = new Map();
    for (const key of this.getKeys()) {
      map.set(key, this.getValue(key));
    }
    return map;
  }
}

type ProxyObj = Record<string | number, string | number | boolean>;

type HooksType = typeof defaultHooks;

const defaultHooks = {
  afterGetValue: ({ value }: { value: string }) =>
    ({ value } as { value: any }),
  beforeSetValue: ({ key, value }: { key: string; value: any }) =>
    ({ key, value } as { key: string; value: any }),
};

const parserHooks = {
  afterGetValue: ({ value }: { value: string }) => {
    try {
      value = JSON.parse(value);
    } catch (e) {
      return { value };
    }
    return { value };
  },
  beforeSetValue: ({ key, value }: { key: string; value: any }) => {
    value = JSON.stringify(value);
    return { key, value };
  },
};
