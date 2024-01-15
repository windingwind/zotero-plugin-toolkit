import { BasicTool } from "../basic";

export class PatchHelper extends BasicTool {
  private data?: PatchData<any, any>;
  constructor() {
    super();
    this.data = undefined;
  }

  public setData<T, K extends FunctionNamesOf<T>>(data: PatchData<T, K>) {
    this.data = data;
    const Zotero = this.getGlobal("Zotero");
    const { target, funcSign, patcher } = data;
    const origin = target[funcSign];
    this.log("patching ", funcSign);

    (target[funcSign] as any) = function (this: T, ...args: any[]) {
      if (data.enabled)
        try {
          return (patcher(origin) as Function).apply(this, args);
        } catch (e) {
          Zotero.logError(e as any);
        }
      return (origin as Function).apply(this, args);
    };
    return this;
  }

  public enable() {
    if (!this.data) throw new Error("No patch data set");
    this.data.enabled = true;
    return this;
  }

  public disable() {
    if (!this.data) throw new Error("No patch data set");
    this.data.enabled = false;
    return this;
  }
}

interface PatchData<T, K extends FunctionNamesOf<T>> {
  target: T;
  funcSign: K;
  patcher: (origin: T[K]) => T[K];
  enabled: boolean;
}

type FunctionNamesOf<T> = keyof FunctionsOf<T>;

type FunctionsOf<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
