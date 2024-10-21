import { BasicTool } from "../basic.js";
import ToolkitGlobal from "../managers/toolkitGlobal.js";

/**
 * Debug bridge.
 *
 * @remarks
 * Global variables: Zotero, window(main window).
 *
 * @example
 * Run script directly. The `run` is URIencoded script.
 *
 * `zotero://ztoolkit-debug/?run=Zotero.getMainWindow().alert(%22HelloWorld!%22)&app=developer`
 * @example
 * Run script from file. The `file` is URIencoded path to js file starts with `file:///`
 *
 * `zotero://ztoolkit-debug/?file=file%3A%2F%2F%2FC%3A%2FUsers%2Fw_xia%2FDesktop%2Frun.js&app=developer`
 */
export class DebugBridge {
  public static readonly version: number = 2;
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
      true,
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
        const window = Zotero.getMainWindow();
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
            params[p.split("=")[0]] = decodeURIComponent(p.split("=")[1]);
          });

        const skipPasswordCheck =
          ToolkitGlobal.getInstance()?.debugBridge.disableDebugBridgePassword;
        let allowed = false;
        if (skipPasswordCheck) {
          allowed = true;
        } else {
          // If password is not set, ask permission for commands without password.
          if (
            typeof params.password === "undefined" &&
            typeof this.password === "undefined"
          ) {
            allowed = window.confirm(
              `External App ${
                params.app
              } wants to execute command without password.\nCommand:\n${(
                params.run ||
                params.file ||
                ""
              ).slice(
                0,
                100,
              )}\nIf you do not know what it is, please click Cancel to deny.`,
            );
          } else {
            allowed = this.password === params.password;
          }
        }
        if (allowed) {
          if (params.run) {
            try {
              const AsyncFunction = Object.getPrototypeOf(
                async () => {},
              ).constructor;
              const f = new AsyncFunction("Zotero,window", params.run);
              await f(Zotero, window);
            } catch (e) {
              Zotero.debug(e);
              (window as any).console.log(e);
            }
          }
          if (params.file) {
            try {
              Services.scriptloader.loadSubScript(params.file, {
                Zotero,
                window,
              });
            } catch (e) {
              Zotero.debug(e);
              (window as any).console.log(e);
            }
          }
        }
      },
      newChannel(uri: any) {
        this.doAction(uri);
      },
    };
    // @ts-expect-error wrappedJSObject
    Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions[
      "zotero://ztoolkit-debug"
    ] = debugBridgeExtension;
  }
}
