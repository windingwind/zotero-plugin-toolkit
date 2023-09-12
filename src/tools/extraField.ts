import { BasicTool } from "../basic";

/**
 * Get/set extra field APIs.
 */
export class ExtraFieldTool extends BasicTool {
  /**
   * Get all extra fields
   * @param item
   */
  getExtraFields(
    item: Zotero.Item,
    backend: "default" | "custom" = "custom"
  ): Map<string, string> {
    const extraFiledRaw = item.getField("extra") as string;
    if (backend === "default") {
      return this.getGlobal("Zotero").Utilities.Internal.extractExtraFields(
        extraFiledRaw
      ).fields as Map<string, string>;
    } else {
      const map = new Map<string, string>();
      const nonStandardFields: string[] = [];
      extraFiledRaw.split("\n").forEach((line) => {
        const split = line.split(": ");
        if (split.length >= 2 && split[0]) {
          map.set(split[0], split.slice(1).join(": "));
        } else {
          nonStandardFields.push(line);
        }
      });
      map.set("__nonStandard__", nonStandardFields.join("\n"));
      return map;
    }
  }

  /**
   * Get extra field value by key. If it does not exists, return undefined.
   * @param item
   * @param key
   */
  getExtraField(item: Zotero.Item, key: string): string | undefined {
    const fields = this.getExtraFields(item);
    return fields.get(key);
  }

  /**
   * Replace extra field of an item.
   * @param item
   * @param fields
   */
  async replaceExtraFields(
    item: Zotero.Item,
    fields: Map<string, string>
  ): Promise<void> {
    let kvs: string[] = [];
    if (fields.has("__nonStandard__")) {
      kvs.push(fields.get("__nonStandard__") as string);
      fields.delete("__nonStandard__");
    }
    fields.forEach((v, k) => {
      kvs.push(`${k}: ${v}`);
    });
    item.setField("extra", kvs.join("\n"));
    await item.saveTx();
  }

  /**
   * Set an key-value pair to the item's extra field
   * @param item
   * @param key
   * @param value
   */
  async setExtraField(
    item: Zotero.Item,
    key: string,
    value: string
  ): Promise<void> {
    const fields = this.getExtraFields(item);
    if (value === "" || typeof value === "undefined") {
      fields.delete(key);
    } else {
      fields.set(key, value);
    }
    await this.replaceExtraFields(item, fields);
  }
}
