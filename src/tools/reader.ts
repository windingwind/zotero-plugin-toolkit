import { BasicTool } from "../basic";

/**
 * Zotero ReaderInstance APIs.
 */
export class ReaderTool extends BasicTool {
  /**
   * Get the selected tab reader.
   * @param waitTime Wait for n MS until the reader is ready
   */
  async getReader(
    waitTime: number = 5000
  ): Promise<_ZoteroReaderInstance | undefined> {
    const Zotero_Tabs = this.getGlobal("Zotero_Tabs");
    if (Zotero_Tabs.selectedType !== "reader") {
      return undefined;
    }
    let reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
    let delayCount = 0;
    const checkPeriod = 50;
    while (!reader && delayCount * checkPeriod < waitTime) {
      await Zotero.Promise.delay(checkPeriod);
      reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
      delayCount++;
    }
    await reader?._initPromise;
    return reader;
  }

  /**
   * Get all window readers.
   */
  getWindowReader(): Array<_ZoteroReaderInstance> {
    const Zotero_Tabs = this.getGlobal("Zotero_Tabs");
    let windowReaders: Array<_ZoteroReaderInstance> = [];
    let tabs = Zotero_Tabs._tabs.map((e) => e.id);
    for (let i = 0; i < Zotero.Reader._readers.length; i++) {
      let flag = false;
      for (let j = 0; j < tabs.length; j++) {
        if (Zotero.Reader._readers[i].tabID == tabs[j]) {
          flag = true;
          break;
        }
      }
      if (!flag) {
        windowReaders.push(Zotero.Reader._readers[i]);
      }
    }
    return windowReaders;
  }

  /**
   * Get Reader tabpanel deck element.
   * @alpha
   */
  getReaderTabPanelDeck(): XUL.Deck {
    const deck = this.getGlobal("window").document.querySelector(
      ".notes-pane-deck"
    ).previousElementSibling as XUL.Deck;
    return deck as XUL.Deck;
  }

  /**
   * Add a reader tabpanel deck selection change observer.
   * @alpha
   * @param callback
   */
  addReaderTabPanelDeckObserver(callback: Function) {
    const deck = this.getReaderTabPanelDeck();
    const observer = new (this.getGlobal("MutationObserver"))(
      async (mutations) => {
        mutations.forEach(async (mutation) => {
          const target = mutation.target as XUL.Element;
          // When the tabbox is ready, the selectedIndex of tabbox is changed.
          // When reader tab is changed, the selectedIndex of deck is changed.
          if (
            target.classList.contains("zotero-view-tabbox") ||
            target.tagName === "deck"
          ) {
            callback();
          }
        });
      }
    );
    observer.observe(deck, {
      attributes: true,
      attributeFilter: ["selectedIndex"],
      subtree: true,
    });
    return observer;
  }

  /**
   * Get the text selection of reader.
   * @param currentReader Target reader
   */
  getSelectedText(currentReader: _ZoteroReaderInstance): string {
    if (!currentReader) {
      return "";
    }
    let _ =
      currentReader._iframeWindow.document.getElementsByTagName("textarea");

    for (let i = 0; i < _.length; i++) {
      // Choose the selection textare
      if (_[i].style["z-index"] == -1 && _[i].style["width"] == "0px") {
        // Trim
        return _[i].value.replace(/(^\s*)|(\s*$)/g, "");
      }
    }
    return "";
  }
}
