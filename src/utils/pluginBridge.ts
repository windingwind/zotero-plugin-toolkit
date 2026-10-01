import type ToolkitGlobal from "../managers/toolkitGlobal.js";
import { BasicTool } from "../basic.js";

/**
 * Plugin bridge. Install plugin from zotero://plugin
 *
 * Any link can reach this handler (a link in a note, or one another app hands to Zotero), so it
 * only installs from an https:// address and always asks the user first, showing that address.
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
  // Version 2 asks before installing. Only the highest version is registered, so this
  // replaces version 1 handlers registered by plugins built with older toolkit releases.
  public static readonly version: number = 2;
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
    const { AddonManager } = ChromeUtils.importESModule(
      "resource://gre/modules/AddonManager.sys.mjs",
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
            if (!/^https:\/\//i.test(params.url)) {
              throw new Error(
                `Plugin ${params.url} was not installed: only https:// addresses are allowed.`,
              );
            }
            if (!confirmInstall(params.url)) {
              return;
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

/**
 * Ask before installing: the link may not come from the user. Cancel is the default button.
 */
function confirmInstall(url: string): boolean {
  const ps = Services.prompt;
  // nsIPromptService constants (typed as optional in zotero-types).
  const flags =
    (ps.BUTTON_POS_0 ?? 1) * (ps.BUTTON_TITLE_IS_STRING ?? 127) +
    (ps.BUTTON_POS_1 ?? 256) * (ps.BUTTON_TITLE_CANCEL ?? 2) +
    (ps.BUTTON_POS_1_DEFAULT ?? 16777216);
  const choice = ps.confirmEx(
    Zotero.getMainWindow() as unknown as mozIDOMWindowProxy,
    "Install a plugin?",
    `A link is asking Zotero to install a plugin from:\n\n${url}\n\n` +
      "Plugins have full access to Zotero and your computer. " +
      "Only install it if you opened this link yourself and trust where it comes from.",
    flags,
    "Install",
    "",
    "",
    "",
    { value: false },
  );
  return choice === 0;
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
