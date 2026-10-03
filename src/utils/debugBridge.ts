import { BasicTool } from "../basic.js";

/**
 * Debug bridge. Runs a script from a `zotero://ztoolkit-debug` link.
 *
 * It is not registered by default. Call `DebugBridge.register()` to enable it, only in
 * development builds, and `DebugBridge.unregister()` on plugin shutdown.
 *
 * @deprecated Since this is a temporary solution for debugging, it is not recommended to use.
 * The zotero-plugin-scaffold no longer need this.
 *
 * @remarks
 * Global variables: Zotero, window(main window).
 *
 * @example
 * Enable it in development builds only.
 * ```ts
 * if (__env__ === "development") {
 *   DebugBridge.register({ disablePassword: true });
 * }
 * ```
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
  public static readonly passwordPref: string =
    "extensions.zotero.debug-bridge.password";

  private static readonly extensionKey = "zotero://ztoolkit-debug";
  private static extension?: object;

  public static get password(): string {
    return BasicTool.getZotero().Prefs.get(
      DebugBridge.passwordPref,
      true,
    ) as string;
  }
  public static set password(v: string) {
    BasicTool.getZotero().Prefs.set(DebugBridge.passwordPref, v, true);
  }

  /**
   * Register the `zotero://ztoolkit-debug` handler, replacing any registered before.
   * @param options Register options.
   * @param options.disablePassword Run commands without checking the password or asking the user.
   */
  public static register(options: { disablePassword?: boolean } = {}) {
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

        const password = DebugBridge.password;
        let allowed = false;
        if (options.disablePassword) {
          allowed = true;
        } else {
          // If password is not set, ask permission for commands without password.
          if (
            typeof params.password === "undefined" &&
            typeof password === "undefined"
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
            allowed = password === params.password;
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
    getProtocolExtensions()[DebugBridge.extensionKey] = debugBridgeExtension;
    DebugBridge.extension = debugBridgeExtension;
  }

  /**
   * Unregister the handler, if it is still the one registered by `register`.
   */
  public static unregister() {
    const extensions = getProtocolExtensions();
    if (
      DebugBridge.extension &&
      extensions[DebugBridge.extensionKey] === DebugBridge.extension
    ) {
      delete extensions[DebugBridge.extensionKey];
    }
    DebugBridge.extension = undefined;
  }
}

function getProtocolExtensions(): Record<string, object> {
  // @ts-expect-error wrappedJSObject
  return Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions;
}
