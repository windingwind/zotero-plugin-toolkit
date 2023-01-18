import { BasicTool } from "../basic";
import { ItemTreeExtraColumnsGlobal } from "./itemTree";

/**
 * The Singleton class of global parameters used by managers.
 * @example `ToolkitGlobal.getInstance().itemTree.state`
 */
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

    /**
     * Get the global unique instance of `class ToolkitGlobal`.
     * @returns An instance of `ToolkitGlobal`.
     */
    static getInstance(): ToolkitGlobal {
        const zotero = BasicTool.getZotero();
        if (!('_toolkitGlobal' in zotero))
            zotero._toolkitGlobal = new ToolkitGlobal();
        return zotero._toolkitGlobal;
    }
}
