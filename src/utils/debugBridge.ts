import { BasicTool } from "../basic";
import ToolkitGlobal from "../managers/toolkitGlobal";

/**
 * Debug bridge.
 *
 * @remarks
 * Global variables: Zotero, window(main window).
 *
 * @example
 * Run script directly. The `run` is URIencoded script.
 *
 * `chrome://ztoolkit-debug/?run=Zotero.getMainWindow().alert(%22HelloWorld!%22)`
 * @example
 * Run script from file. The `file` is URIencoded path to js file starts with `file:///`
 *
 * `chrome://ztoolkit-debug/?file=file%3A%2F%2F%2FC%3A%2FUsers%2Fw_xia%2FDesktop%2Frun.js`
 */
export class DebugBridge {
  public static readonly version: number = 1;
  public static readonly passwordPref: string =
    "extensions.zotero.debug-bridge.password";
  public get version(): number {
    return DebugBridge.version;
  }

  private _disableDebugBridgePassword: boolean;
  public get disableDebugBridgePassword(): boolean {
    return this._disableDebugBridgePassword;
  }
  public set disableDebugBridgePassword(value: boolean) {
    this._disableDebugBridgePassword = value;
  }

  public get password(): string {
    return BasicTool.getZotero().Prefs.get(
      DebugBridge.passwordPref,
      true
    ) as string;
  }
  public set password(v: string) {
    BasicTool.getZotero().Prefs.set(DebugBridge.passwordPref, v, true);
  }

  constructor() {
    this._disableDebugBridgePassword = false;
    this.initializeDebugBridge();
  }

  public static setModule(instance: ToolkitGlobal) {
    if (
      !instance.debugBridge?.version ||
      instance.debugBridge.version < DebugBridge.version
    ) {
      instance.debugBridge = new DebugBridge();
    }
  }

  private initializeDebugBridge() {
    const debugBridgeExtension = {
      noContent: true,
      doAction: async (uri: { spec: string }) => {
        const Zotero = BasicTool.getZotero();
        const uriString = uri.spec.split("//").pop();
        if (!uriString) {
          return;
        }
        const params: { [key: string]: any } = {};
        uriString
          .split("?")
          .pop()
          ?.split("&")
          .forEach((p: string) => {
            params[p.split("=")[0]] = p.split("=")[1];
          });
        if (
          ToolkitGlobal.getInstance().debugBridge.disableDebugBridgePassword ||
          params.password === this.password
        ) {
          if (params.run) {
            try {
              const AsyncFunction = Object.getPrototypeOf(
                async function () {}
              ).constructor;
              const f = new AsyncFunction(
                "Zotero,window",
                decodeURIComponent(params.run)
              );
              await f(Zotero, Zotero.getMainWindow());
            } catch (e) {
              Zotero.debug(e);
              (Zotero.getMainWindow() as any).console.log(e);
            }
          }
          if (params.file) {
            try {
              Services.scriptloader.loadSubScript(
                decodeURIComponent(params.file),
                { Zotero, window: Zotero.getMainWindow() }
              );
            } catch (e) {
              Zotero.debug(e);
              (Zotero.getMainWindow() as any).console.log(e);
            }
          }
        }
      },
      newChannel: function (uri: any) {
        this.doAction(uri);
      },
    };
    Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions[
      "zotero://ztoolkit-debug"
    ] = debugBridgeExtension;
  }
}
