import { BasicTool } from "../basic.js";

/**
 * Get/set extra field APIs.
 */
export class ExtraFieldTool extends BasicTool {
  /**
   * Get all extra fields
   * @param item Zotero item
   * @param parser Parsing mode:
   *   - "default": use the enhanced custom parser (supports duplicate keys)
   *   - "zotero": use Zotero’s built-in parser (single value per key)
   */
  getExtraFields(item: Zotero.Item, parser: "zotero"): Map<string, string>;
  getExtraFields(item: Zotero.Item, parser?: "default"): Map<string, string[]>;
  getExtraFields(
    item: Zotero.Item,
    parser: "default" | "zotero" = "default",
  ): Map<string, string> | Map<string, string[]> {
    const extraFiledRaw = item.getField("extra") as string;

    if (parser === "zotero") {
      // Zotero built-in parser (single value per key)
      return this.getGlobal("Zotero").Utilities.Internal.extractExtraFields(
        extraFiledRaw,
      ).fields as Map<string, string>;
    } else {
      // Custom enhanced parser (supports multiple same keys)
      const map = new Map<string, string[]>();
      const nonStandardFields: string[] = [];

      extraFiledRaw.split("\n").forEach((line) => {
        if (!line) return;

        const split = line.split(": ");
        if (split.length >= 2 && split[0]) {
          const key = split[0];
          const value = split.slice(1).join(": ");
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(value);
        } else {
          nonStandardFields.push(line);
        }
      });

      if (nonStandardFields.length > 0) {
        map.set("__nonStandard__", [nonStandardFields.join("\n")]);
      }

      return map;
    }
  }
  /**
   * Get extra field value by key. If it does not exists, return undefined.
   * @param item
   * @param key
   * @param [all] Whether to return all values if the field appears multiple times.
   */
  getExtraField(
    item: Zotero.Item,
    key: string,
    all?: false,
  ): string | undefined;
  getExtraField(
    item: Zotero.Item,
    key: string,
    all: true,
  ): string[] | undefined;
  getExtraField(
    item: Zotero.Item,
    key: string,
    all = false,
  ): string | string[] | undefined {
    const fields = this.getExtraFields(item, "default");
    const values = fields.get(key);
    if (!values) return undefined;
    return all ? values : values[0];
  }

  /**
   * Replace extra field of an item.
   * @param item
   * @param fields
   * @param [options] Additional options.
   * @param [options.save] Whether to save the item, default to true.
   */
  async replaceExtraFields(
    item: Zotero.Item,
    fields: Map<string, string[]>,
    options: { save?: boolean } = {},
  ): Promise<void> {
    const { save = true } = options;
    const kvs: string[] = [];

    if (fields.has("__nonStandard__")) {
      kvs.push(...(fields.get("__nonStandard__") as string[]));
      fields.delete("__nonStandard__");
    }

    fields.forEach((values, key) => {
      values.forEach((v) => kvs.push(`${key}: ${v}`));
    });

    item.setField("extra", kvs.join("\n"));
    if (save) await item.saveTx();
  }

  /**
   * Set a key-value pair in the item's extra field.
   * If the key already exists, it can be overwritten or appended.
   * @param item Zotero item
   * @param key Field key
   * @param value Field value or list of values
   * @param options Additional options
   * @param [options.append] Whether to append to existing values, default to false
   * @param [options.save] Whether to save the item, default to true
   */
  async setExtraField(
    item: Zotero.Item,
    key: string,
    value: string | string[],
    options: { append?: boolean; save?: boolean } = {},
  ): Promise<void> {
    const { append = false, save = true } = options;

    const fields = this.getExtraFields(item, "default");

    if (value === "" || typeof value === "undefined") {
      fields.delete(key);
    } else {
      const values = Array.isArray(value) ? value : [value];
      if (append && fields.has(key)) {
        fields.get(key)!.push(...values);
      } else {
        fields.set(key, values);
      }
    }

    await this.replaceExtraFields(item, fields, { save });
  }
}
