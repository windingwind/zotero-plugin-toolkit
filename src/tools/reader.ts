import { BasicTool } from "../basic.js";

/**
 * Zotero ReaderInstance APIs.
 */
export class ReaderTool extends BasicTool {
  /**
   * Get the selected tab reader.
   * @param waitTime Wait for n MS until the reader is ready
   */
  async getReader(
    waitTime: number = 5000,
  ): Promise<_ZoteroTypes.ReaderInstance | undefined> {
    const Zotero_Tabs = this.getGlobal("Zotero_Tabs");
    if (Zotero_Tabs.selectedType !== "reader") {
      return undefined;
    }
    let reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
    let delayCount = 0;
    const checkPeriod = 50;
    while (!reader && delayCount * checkPeriod < waitTime) {
      await new Promise((resolve) => setTimeout(resolve, checkPeriod));
      reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
      delayCount++;
    }
    await reader?._initPromise;
    return reader;
  }

  /**
   * Get all window readers.
   */
  getWindowReader(): Array<_ZoteroTypes.ReaderWindow> {
    const Zotero_Tabs = this.getGlobal("Zotero_Tabs");
    const windowReaders: Array<_ZoteroTypes.ReaderWindow> = [];
    const tabs = Zotero_Tabs._tabs.map((e) => e.id);
    for (let i = 0; i < Zotero.Reader._readers.length; i++) {
      let flag = false;
      for (let j = 0; j < tabs.length; j++) {
        if (Zotero.Reader._readers[i].tabID === tabs[j]) {
          flag = true;
          break;
        }
      }
      if (!flag) {
        windowReaders.push(
          Zotero.Reader._readers[i] as _ZoteroTypes.ReaderWindow,
        );
      }
    }
    return windowReaders;
  }

  /**
   * Get the selected annotation data.
   * @param reader Target reader
   * @returns The selected annotation data.
   */
  getSelectedAnnotationData(
    reader: _ZoteroTypes.ReaderInstance,
  ): AnnotationData | undefined {
    const annotation =
      // @ts-expect-error _selectionPopup
      reader?._internalReader._lastView._selectionPopup?.annotation;
    return annotation;
  }

  /**
   * Get the text selection of reader.
   * @param reader Target reader
   * @returns The text selection of reader.
   */
  getSelectedText(reader: _ZoteroTypes.ReaderInstance): string {
    return this.getSelectedAnnotationData(reader)?.text ?? "";
  }
}

interface AnnotationData {
  color?: string;
  pageLabel: string;
  position: Record<string, any>;
  sortIndex: string;
  text: string;
  type: _ZoteroTypes.Annotations.AnnotationType;
}
