/**
 * Helper class for storing large amounts of data in Zotero preferences.
 *
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
export class LargePrefHelper {
  private keyPref: string;
  private valuePrefPrefix: string;
  private innerObj!: Record<string, string>;
  private exposedObj!: ProxyObj;

  constructor(keyPref: string, valuePrefPrefix: string) {
    this.keyPref = keyPref;
    this.valuePrefPrefix = valuePrefPrefix;
    this.constructProxyObj();
  }

  /**
   * Get the object that stores the data.
   * @returns The object that stores the data.
   */
  public asObject(): ProxyObj {
    return this.exposedObj;
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
    const value = Zotero.Prefs.get(`${this.valuePrefPrefix}.${key}`, true) as
      | string
      | undefined;
    if (typeof value === "undefined") {
      return;
    }
    this.innerObj[key] = value;
    return value;
  }

  /**
   * Set the value of a key.
   * @param key The key of the data.
   * @param value The value of the key.
   */
  public setValue(key: string, value: string) {
    this.setKey(key);
    Zotero.Prefs.set(`${this.valuePrefPrefix}.${key}`, value, true);
    this.innerObj[key] = value;
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
    Zotero.Prefs.clear(`${this.valuePrefPrefix}.${key}`, true);
  }

  private constructProxyObj(): void {
    this.innerObj = {};
    this.exposedObj = new Proxy(this.innerObj, {
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
}

type ProxyObj = Record<string | number, string | number | boolean>;
