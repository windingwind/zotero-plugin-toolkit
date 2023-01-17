import { ItemTreeExtraColumnsGlobal } from "./itemTree";

export default class ToolkitGlobal {
    readonly itemTree: ItemTreeExtraColumnsGlobal;

    private constructor() {
        this.itemTree = {
            state: 'idle',
            columns: [],
            fieldHooks: {},
            renderCellHooks: {},
        };
    }

    static getInstance(zotero: _ZoteroTypes.Zotero): ToolkitGlobal {
        if (!('_toolkitGlobal' in zotero))
            zotero._toolkitGlobal = new ToolkitGlobal();
        return zotero._toolkitGlobal;
    }
}
