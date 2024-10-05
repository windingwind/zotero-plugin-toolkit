import { BasicTool } from "../basic.js";

export class PatchHelper extends BasicTool {
  private options?: PatchOptions<any, any>;
  constructor() {
    super();
    this.options = undefined;
  }

  public setData<T, K extends FunctionNamesOf<T>>(options: PatchOptions<T, K>) {
    this.options = options;
    const Zotero = this.getGlobal("Zotero");
    const { target, funcSign, patcher } = options;
    const origin = target[funcSign];
    this.log("patching ", funcSign);

    (target[funcSign] as any) = function (this: T, ...args: any[]) {
      if (options.enabled)
        try {
          // eslint-disable-next-line ts/no-unsafe-function-type
          return (patcher(origin) as Function).apply(this, args);
        } catch (e) {
          Zotero.logError(e as any);
        }
      // eslint-disable-next-line ts/no-unsafe-function-type
      return (origin as Function).apply(this, args);
    };
    return this;
  }

  public enable() {
    if (!this.options) throw new Error("No patch data set");
    this.options.enabled = true;
    return this;
  }

  public disable() {
    if (!this.options) throw new Error("No patch data set");
    this.options.enabled = false;
    return this;
  }
}

declare interface PatchOptions<T, K extends FunctionNamesOf<T>> {
  target: T;
  funcSign: K;
  patcher: (origin: T[K]) => T[K];
  enabled: boolean;
}
