import type ToolkitGlobal from "../managers/toolkitGlobal.js";
import { BasicTool } from "../basic.js";

/**
 * Plugin bridge. Install plugin from zotero://plugin
 *
 * @deprecated Since this is a temporary solution for debugging, it is not recommended to use.
 * The zotero-plugin-scaffold no longer need this.
 *
 * @example
 * Install plugin from url, with minimal Zotero version requirement.
 * ```text
 * zotero://plugin/?action=install&url=https%3A%2F%2Fgithub.com%2FMuiseDestiny%2Fzotero-style%2Freleases%2Fdownload%2F3.0.5%2Fzotero-style.xpi&minVersion=6.999
 * ```
 */
export class PluginBridge {
  public static readonly version: number = 1;
  public get version(): number {
    return PluginBridge.version;
  }

  constructor() {
    this.initializePluginBridge();
  }

  public static setModule(instance: ToolkitGlobal) {
    if (
      !instance.pluginBridge?.version ||
      instance.pluginBridge.version < PluginBridge.version
    ) {
      instance.pluginBridge = new PluginBridge();
    }
  }

  private initializePluginBridge() {
    const { AddonManager } = ChromeUtils.import(
      "resource://gre/modules/AddonManager.jsm",
    );
    const Zotero = BasicTool.getZotero();
    const pluginBridgeExtension = {
      noContent: true,
      doAction: async (uri: { spec: string }) => {
        try {
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
          if (params.action === "install" && params.url) {
            if (
              (params.minVersion &&
                Services.vc.compare(Zotero.version, params.minVersion) < 0) ||
              (params.maxVersion &&
                Services.vc.compare(Zotero.version, params.maxVersion) > 0)
            ) {
              throw new Error(
                `Plugin is not compatible with Zotero version ${Zotero.version}.` +
                  `The plugin requires Zotero version between ${params.minVersion} and ${params.maxVersion}.`,
              );
            }
            const addon = await AddonManager.getInstallForURL(params.url);
            if (addon && addon.state === AddonManager.STATE_AVAILABLE) {
              addon.install();
              hint("Plugin installed successfully.", true);
            } else {
              throw new Error(`Plugin ${params.url} is not available.`);
            }
          }
        } catch (e: any) {
          Zotero.logError(e);
          hint(e.message, false);
        }
      },
      newChannel(uri: any) {
        this.doAction(uri);
      },
    };
    // @ts-expect-error wrappedJSObject
    Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions[
      "zotero://plugin"
    ] = pluginBridgeExtension;
  }
}

function hint(content: string, success: boolean) {
  const progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
  progressWindow.changeHeadline("Plugin Toolkit");
  // @ts-expect-error custom
  progressWindow.progress = new progressWindow.ItemProgress(
    success
      ? "chrome://zotero/skin/tick.png"
      : "chrome://zotero/skin/cross.png",
    content,
  );
  // @ts-expect-error custom
  progressWindow.progress.setProgress(100);
  progressWindow.show();
  progressWindow.startCloseTimer(5000);
}
