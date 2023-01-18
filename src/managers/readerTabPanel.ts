import { BasicOptions, BasicTool } from "../basic";
import { UITool } from "../tools/ui";
import { ReaderTool } from "../tools/reader";
import { ManagerTool } from "../basic";

/**
 * Register new \<tabpanel\> in reader right-side bar.
 */
export class ReaderTabPanelManager extends ManagerTool {
  private ui: UITool;
  private readerTool: ReaderTool;
  private readerTabCache: {
    optionsList: {
      tabId: string;
      tabLabel: string;
      panelId: string;
      renderPanelHook: (
        panel: XUL.TabPanel | undefined,
        ownerDeck: XUL.Deck,
        ownerWindow: Window,
        readerInstance: _ZoteroTypes.ReaderInstance
      ) => void;
      targetIndex: number;
      selectPanel?: boolean;
    }[];
    observer?: MutationObserver;
    initializeLock?: _ZoteroTypes.PromiseObject;
  };
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.ui = new UITool(this);
    this.readerTool = new ReaderTool(this);
    this.readerTabCache = {
      optionsList: [],
      observer: undefined,
      initializeLock: undefined,
    };
  }

  /**
   * Register a tabpanel for every reader.
   * @remarks
   * Don't forget to call `unregisterReaderTabPanel` on exit.
   * @remarks
   * Every time a tab reader is selected/opened, the hook will be called.
   * @param tabLabel Label of panel tab.
   * @param renderPanelHook Called when panel is ready. Add elements to the panel.
   *
   * The panel might be `undefined` when opening a PDF without parent item.
   *
   * The owner deck is the top container of right-side bar.
   *
   * The readerInstance is the reader of current tabpanel.
   * @param options Other optional parameters.
   * @param options.tabId ID of panel tab. Also used as unregister query. If not set, generate a random one.
   * @param options.panelId ID of panel container (XUL.TabPanel). If not set, generate a random one.
   * @param options.targetIndex Index of the inserted tab. Default the end of tabs.
   * @param options.selectPanel If the panel should be selected immediately.
   * @returns tabId. Use it for unregister.
   * @example
   * Register an extra reader tabpanel into index 1.
   * ```ts
   * const readerTabId = `${config.addonRef}-extra-reader-tab`;
   * this._Addon.toolkit.UI.registerReaderTabPanel(
   *   "test",
   *   (
   *     panel: XUL.Element,
   *     deck: XUL.Deck,
   *     win: Window,
   *     reader: _ZoteroReaderInstance
   *   ) => {
   *     if (!panel) {
   *       this._Addon.toolkit.Tool.log(
   *         "This reader do not have right-side bar. Adding reader tab skipped."
   *       );
   *       return;
   *     }
   *     this._Addon.toolkit.Tool.log(reader);
   *     const elem = this._Addon.toolkit.UI.creatElementsFromJSON(
   *       win.document,
   *       {
   *         tag: "vbox",
   *         id: `${config.addonRef}-${reader._instanceID}-extra-reader-tab-div`,
   *         namespace: "xul",
   *         // This is important! Don't create content for multiple times
   *         ignoreIfExists: true,
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
   *               value: "This is a reader tab.",
   *             },
   *           },
   *           {
   *             tag: "label",
   *             namespace: "xul",
   *             directAttributes: {
   *               value: `Reader: ${reader._title.slice(0, 20)}`,
   *             },
   *           },
   *           {
   *             tag: "label",
   *             namespace: "xul",
   *             directAttributes: {
   *               value: `itemID: ${reader.itemID}.`,
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
   *                   this._Addon.toolkit.UI.unregisterReaderTabPanel(
   *                     readerTabId
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
   *     tabId: readerTabId,
   *   }
   * );
   * ```
   */
  async register(
    tabLabel: string,
    renderPanelHook: (
      panel: XUL.TabPanel | undefined,
      ownerDeck: XUL.Deck,
      ownerWindow: Window,
      readerInstance: _ZoteroTypes.ReaderInstance
    ) => void,
    options?: {
      tabId?: string;
      panelId?: string;
      targetIndex?: number;
      selectPanel?: boolean;
    }
  ) {
    options = options || {
      tabId: undefined,
      panelId: undefined,
      targetIndex: -1,
      selectPanel: false,
    };
    if (typeof this.readerTabCache.initializeLock === "undefined") {
      await this.initializeReaderTabObserver();
    }
    await this.readerTabCache.initializeLock?.promise;
    const randomId = `${Zotero.Utilities.randomString()}-${new Date().getTime()}`;
    const tabId = options.tabId || `toolkit-readertab-${randomId}`;
    const panelId = options.panelId || `toolkit-readertabpanel-${randomId}`;
    const targetIndex =
      typeof options.targetIndex === "number" ? options.targetIndex : -1;
    this.readerTabCache.optionsList.push({
      tabId,
      tabLabel,
      panelId,
      renderPanelHook,
      targetIndex,
      selectPanel: options.selectPanel,
    });
    // Try to add tabpanel to current reader immediately
    await this.addReaderTabPanel();
    return tabId;
  }

  /**
   * Unregister the reader tabpanel.
   * @param tabId tab id
   */
  unregister(tabId: string) {
    const idx = this.readerTabCache.optionsList.findIndex(
      (v) => v.tabId === tabId
    );
    if (idx >= 0) {
      this.readerTabCache.optionsList.splice(idx, 1);
    }
    if (this.readerTabCache.optionsList.length === 0) {
      this.readerTabCache.observer?.disconnect();
      this.readerTabCache = {
        optionsList: [],
        observer: undefined,
        initializeLock: undefined,
      };
    }
    this.removeTabPanel(tabId);
  }

  /**
   * Unregister all library tabpanel.
   */
  unregisterAll() {
    const tabIds = this.readerTabCache.optionsList.map(
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

  private async initializeReaderTabObserver() {
    this.readerTabCache.initializeLock =
      this.getGlobal("Zotero").Promise.defer();
    await Promise.all([
      Zotero.initializationPromise,
      Zotero.unlockPromise,
      Zotero.uiReadyPromise,
    ]);
    const observer = this.readerTool.addReaderTabPanelDeckObserver(() => {
      this.addReaderTabPanel();
    });
    this.readerTabCache.observer = observer;
    this.readerTabCache.initializeLock.resolve();
  }

  private async addReaderTabPanel() {
    const window = this.getGlobal("window");
    const deck = this.readerTool.getReaderTabPanelDeck();
    const tabbox = deck.selectedPanel?.querySelector("tabbox") as
      | XUL.TabBox
      | undefined;
    if (!tabbox) {
      return;
    }
    const reader = await this.readerTool.getReader();
    if (!reader) {
      return;
    }
    this.readerTabCache.optionsList.forEach((options) => {
      if (tabbox) {
        const tab = this.ui.createElement(window.document, "tab", {
          id: `${options.tabId}-${reader._instanceID}`,
          classList: [`toolkit-ui-tabs-${options.tabId}`],
          attributes: {
            label: options.tabLabel,
          },
          ignoreIfExists: true,
        }) as XUL.Tab;
        const tabpanel = this.ui.createElement(window.document, "tabpanel", {
          id: `${options.panelId}-${reader._instanceID}`,
          classList: [`toolkit-ui-tabs-${options.tabId}`],
          ignoreIfExists: true,
        }) as XUL.TabPanel;
        const tabs = tabbox.querySelector("tabs");
        const tabpanels = tabbox.querySelector("tabpanels");
        if (options.targetIndex >= 0) {
          tabs?.querySelectorAll("tab")[options.targetIndex].before(tab);
          tabpanels
            ?.querySelectorAll("tabpanel")
            [options.targetIndex].before(tabpanel);
          if (tabbox.getAttribute("toolkit-select-fixed") !== "true") {
            // Tabs after current tab will not be correctly selected
            // A workaround to manually set selection.
            tabbox.tabpanels.addEventListener("select", () => {
              this.getGlobal("setTimeout")(() => {
                // @ts-ignore
                tabbox.tabpanels.selectedPanel = tabbox.tabs.getRelatedElement(
                  tabbox.tabs.selectedItem
                );
              }, 0);
            });
            tabbox.setAttribute("toolkit-select-fixed", "true");
          }
        } else {
          tabs?.appendChild(tab);
          tabpanels?.appendChild(tabpanel);
        }
        if (options.selectPanel) {
          tabbox.selectedTab = tab;
        }
        options.renderPanelHook(tabpanel, deck, window, reader);
      } else {
        options.renderPanelHook(undefined, deck, window, reader);
      }
    });
  }
}
