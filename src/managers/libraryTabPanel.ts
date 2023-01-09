import { BasicTool } from "../basic";
import { UITool } from "../tools/ui";
import { ManagerInterface } from "../basic";

/**
 * Register a new \<tabpanel\> in library right-side bar.
 */
export class LibraryTabPanelManager
  extends BasicTool
  implements ManagerInterface
{
  private ui: UITool;
  private libraryTabCache: {
    optionsList: {
      tabId: string;
      tabLabel: string;
      panelId: string;
      renderPanelHook: (
        panel: XUL.TabPanel | undefined,
        ownerWindow: Window
      ) => void;
      targetIndex: number;
      selectPanel?: boolean;
    }[];
  };
  constructor(base?: BasicTool) {
    super(base);
    this.ui = new UITool(this);
    this.libraryTabCache = {
      optionsList: [],
    };
  }
  /**
   * Register a tabpanel in library.
   * @remarks
   * If you don't want to remove the tab & panel in runtime, `unregisterLibraryTabPanel` is not a must.
   *
   * The elements wiil be removed by `removeAddonElements`.
   * @param tabLabel Label of panel tab.
   * @param renderPanelHook Called when panel is ready. Add elements to the panel.
   * @param options Other optional parameters.
   * @param options.tabId ID of panel tab. Also used as unregister query. If not set, generate a random one.
   * @param options.panelId ID of panel container (XUL.TabPanel). If not set, generate a random one.
   * @param options.targetIndex Index of the inserted tab. Default the end of tabs.
   * @param options.selectPanel If the panel should be selected immediately.
   * @returns tabId. Use it for unregister.
   * @example
   * Register an extra library tabpanel into index 1.
   * ```ts
   * const libPaneManager = new LibraryTabPanelManager();
   * const libTabId = libPaneManager.registerLibraryTabPanel(
   *   "test",
   *   (panel: XUL.Element, win: Window) => {
   *     const elem = ui.creatElementsFromJSON(
   *       win.document,
   *       {
   *         tag: "vbox",
   *         namespace: "xul",
   *         subElementOptions: [
   *           {
   *             tag: "h2",
   *             directAttributes: {
   *               innerText: "Hello World!",
   *             },
   *           },
   *           {
   *             tag: "label",
   *             namespace: "xul",
   *             directAttributes: {
   *               value: "This is a library tab.",
   *             },
   *           },
   *           {
   *             tag: "button",
   *             directAttributes: {
   *               innerText: "Unregister",
   *             },
   *             listeners: [
   *               {
   *                 type: "click",
   *                 listener: () => {
   *                   ui.unregisterLibraryTabPanel(
   *                     libTabId
   *                   );
   *                 },
   *               },
   *             ],
   *           },
   *         ],
   *       }
   *     );
   *     panel.append(elem);
   *   },
   *   {
   *     targetIndex: 1,
   *   }
   * );
   * ```
   */
  register(
    tabLabel: string,
    renderPanelHook: (panel: XUL.TabPanel, ownerWindow: Window) => void,
    options?: {
      tabId?: string;
      panelId?: string;
      targetIndex?: number;
      selectPanel?: boolean;
    }
  ): string {
    options = options || {
      tabId: undefined,
      panelId: undefined,
      targetIndex: -1,
      selectPanel: false,
    };
    const window = this.getGlobal("window");
    const tabbox = window.document.querySelector(
      "#zotero-view-tabbox"
    ) as XUL.TabBox;
    const randomId = `${Zotero.Utilities.randomString()}-${new Date().getTime()}`;
    const tabId = options.tabId || `toolkit-readertab-${randomId}`;
    const panelId = options.panelId || `toolkit-readertabpanel-${randomId}`;
    const tab = this.ui.creatElementsFromJSON(window.document, {
      tag: "tab",
      namespace: "xul",
      id: tabId,
      classList: [`toolkit-ui-tabs-${tabId}`],
      attributes: {
        label: tabLabel,
      },
      ignoreIfExists: true,
    }) as XUL.Tab;
    const tabpanel = this.ui.creatElementsFromJSON(window.document, {
      tag: "tabpanel",
      namespace: "xul",
      id: panelId,
      classList: [`toolkit-ui-tabs-${tabId}`],
      ignoreIfExists: true,
    }) as XUL.TabPanel;
    const tabs = tabbox.querySelector("tabs");
    const tabpanels = tabbox.querySelector("tabpanels");
    const targetIndex =
      typeof options.targetIndex === "number" ? options.targetIndex : -1;
    if (targetIndex >= 0) {
      tabs.querySelectorAll("tab")[targetIndex].before(tab);
      tabpanels.querySelectorAll("tabpanel")[targetIndex].before(tabpanel);
    } else {
      tabs.appendChild(tab);
      tabpanels.appendChild(tabpanel);
    }
    if (options.selectPanel) {
      tabbox.selectedTab = tab;
    }
    this.libraryTabCache.optionsList.push({
      tabId,
      tabLabel,
      panelId,
      renderPanelHook,
      targetIndex,
      selectPanel: options.selectPanel,
    });
    renderPanelHook(tabpanel, window);
    return tabId;
  }

  /**
   * Unregister the library tabpanel.
   * @param tabId tab id
   */
  unregister(tabId: string) {
    const idx = this.libraryTabCache.optionsList.findIndex(
      (v) => v.tabId === tabId
    );
    if (idx >= 0) {
      this.libraryTabCache.optionsList.splice(idx, 1);
    }
    this.removeTabPanel(tabId);
  }

  /**
   * Unregister all library tabpanel.
   */
  unregisterAll() {
    const tabIds = this.libraryTabCache.optionsList.map(
      (options) => options.tabId
    );
    tabIds.forEach(this.unregister.bind(this));
  }

  private removeTabPanel(tabId: string) {
    const doc = this.getGlobal("document");
    Array.prototype.forEach.call(
      doc.querySelectorAll(`.toolkit-ui-tabs-${tabId}`),
      (e: XUL.Tab) => {
        e.remove();
      }
    );
  }
}
