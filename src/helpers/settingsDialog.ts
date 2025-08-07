import type { TagElementProps } from "../tools/ui.js";
import { DialogHelper } from "./dialog.js";

/**
 * Settings dialog helper. Extends DialogHelper with setting management capabilities.
 */
export class SettingsDialogHelper extends DialogHelper {
  private settingsHandlers: {
    getSetting: (key: string) => any;
    setSetting: (key: string, value: any) => void;
  } | null = null;

  private autoSaveButtonIds: Set<string> = new Set();
  private settingBindings: Map<
    string,
    { key: string; valueType?: "string" | "number" | "boolean" }
  > = new Map();

  /**
   * Create a settings dialog helper.
   * Uses a 2-column grid layout by default (label column + control column)
   */
  constructor() {
    super(1, 2); // Start with 1 row, 2 columns for the grid layout

    // Override the default element structure to use CSS Grid
    this.elementProps = {
      tag: "vbox",
      attributes: { flex: 1 },
      styles: {
        width: "100%",
        height: "100%",
        padding: "20px",
      },
      children: [
        {
          tag: "div",
          classList: ["settings-grid"],
          styles: {
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "15px 20px",
            alignItems: "center",
            marginBottom: "20px",
          },
          children: [],
        },
        {
          tag: "hbox",
          attributes: { flex: 0, pack: "end" },
          styles: {
            marginTop: "20px",
          },
          children: [],
        },
      ],
    };
  }

  /**
   * Set the setting handlers for getting and setting values.
   * @param getSetting Function to get a setting value by key
   * @param setSetting Function to set a setting value by key
   */
  setSettingHandlers(
    getSetting: (key: string) => any,
    setSetting: (key: string, value: any) => void,
  ) {
    this.settingsHandlers = { getSetting, setSetting };
    return this;
  }

  /**
   * Add a setting row with label and form control.
   * @param label Label text for the setting
   * @param settingKey The key used to store/retrieve the setting
   * @param controlProps Properties for the form control element
   * @param options Additional options
   * @param options.valueType Type of the setting value for proper conversion
   * @param options.labelProps Properties for the label element
   * @param options.condition Optional condition function to determine if the setting should be added
   *                          (returns true to add, false to skip)
   * @returns The SettingsDialogHelper instance for chaining
   */
  addSetting(
    label: string,
    settingKey: string,
    controlProps: TagElementProps,
    options: {
      valueType?: "string" | "number" | "boolean";
      labelProps?: Partial<TagElementProps>;
      condition?: () => boolean;
    } = {},
  ) {
    const { valueType = "string", labelProps = {}, condition } = options;

    // Skip if condition is not met
    if (condition && !condition()) {
      return this; // No-op if condition is false
    }

    // Generate unique ID for the control
    const controlId = `setting-${settingKey}-${Zotero.Utilities.randomString()}`;

    // Store the binding information
    this.settingBindings.set(controlId, { key: settingKey, valueType });

    // Get the grid container
    const gridContainer = this.elementProps.children![0];

    // Add label
    const labelElement: TagElementProps = {
      tag: "label",
      attributes: {
        for: controlId,
      },
      properties: {
        textContent: label,
      },
      styles: {
        fontWeight: "500",
        textAlign: "right",
        paddingRight: "10px",
      },
      ...labelProps,
    };

    // Prepare control element
    const controlElement: TagElementProps = {
      ...controlProps,
      id: controlId,
      attributes: {
        ...controlProps.attributes,
        "data-setting-key": settingKey,
        "data-setting-type": valueType,
      },
    };

    // Load initial value if handlers are set
    if (this.settingsHandlers) {
      const currentValue = this.settingsHandlers.getSetting(settingKey);
      this.setControlValue(controlElement, currentValue, valueType);
    }

    // Add elements to grid
    gridContainer.children!.push(labelElement, controlElement);

    return this;
  }

  /**
   * Add a control button that will auto-save settings when clicked.
   * @param label Button label
   * @param id Button id
   * @param options Button options
   * @param options.noClose Don't close window when clicking this button
   * @param options.validate Validation function for settings data
   * @param options.callback Callback of button click event
   */
  addAutoSaveButton(
    label: string,
    id?: string,
    options: {
      noClose?: boolean;
      validate?: (data: any) => true | string;
      callback?: (ev: Event) => any;
    } = {},
  ) {
    id = id || `btn-${Zotero.Utilities.randomString()}-${new Date().getTime()}`;
    this.autoSaveButtonIds.add(id);

    return this.addButton(label, id, {
      ...options,
      callback: (ev: Event) => {
        if (options.validate) {
          // Validate settings before saving
          const data = this.getAllSettingsData();
          const validationResult = options.validate(data);
          if (validationResult !== true) {
            this.window.alert(validationResult);
            return;
          }
        }
        // Auto-save settings before executing custom callback
        this.saveAllSettings();
        if (options.callback) {
          options.callback(ev);
        }
      },
    });
  }

  /**
   * Save all settings using the setting handlers.
   */
  saveAllSettings() {
    if (!this.settingsHandlers) {
      console.warn("SettingsDialog: No setting handlers configured");
      return;
    }

    // Reuse getAllSettingsData logic to get all current values
    const settingsData = this.getAllSettingsData();

    // Save each setting using the handlers
    Object.entries(settingsData).forEach(([key, value]) => {
      this.settingsHandlers!.setSetting(key, value);
    });
  }

  /**
   * Collect and return all current setting values from the dialog controls.
   */
  getAllSettingsData(): Record<string, any> {
    const data: Record<string, any> = {};
    if (this.window) {
      const settingControls =
        this.window.document.querySelectorAll("[data-setting-key]");
      settingControls.forEach((control: Element) => {
        const settingKey = control.getAttribute("data-setting-key");
        const valueType = control.getAttribute("data-setting-type") as
          | "string"
          | "number"
          | "boolean";
        if (settingKey) {
          data[settingKey] = this.getControlValue(control, valueType);
        }
      });
    }
    return data;
  }

  /**
   * Load all settings from the setting handlers.
   */
  loadAllSettings() {
    if (!this.settingsHandlers || !this.window) {
      return;
    }

    const settingControls =
      this.window.document.querySelectorAll("[data-setting-key]");
    settingControls.forEach((control: Element) => {
      const settingKey = control.getAttribute("data-setting-key");
      const valueType = control.getAttribute("data-setting-type") as
        | "string"
        | "number"
        | "boolean";

      if (settingKey) {
        const value = this.settingsHandlers!.getSetting(settingKey);
        this.setControlValueOnElement(control, value, valueType);
      }
    });
  }

  /**
   * Override the open method to handle setting loading after window opens.
   */
  open(
    title: string,
    windowFeatures: {
      width?: number;
      height?: number;
      left?: number;
      top?: number;
      centerscreen?: boolean;
      resizable?: boolean;
      fitContent?: boolean;
      noDialogMode?: boolean;
      alwaysRaised?: boolean;
    } = {
      centerscreen: true,
      resizable: true,
      fitContent: true,
    },
  ) {
    // Set up dialog data with custom load callback
    const originalLoadCallback = this.dialogData.loadCallback;
    this.dialogData.loadCallback = () => {
      // Load settings after window is ready
      this.loadAllSettings();

      this.window.document.body.style.overflow = "hidden";
      if (windowFeatures.fitContent) {
        this.window.sizeToContent();
      }

      // Call original callback if it exists
      if (originalLoadCallback) {
        originalLoadCallback();
      }
    };

    // Set up before unload callback for auto-save
    const originalBeforeUnloadCallback = this.dialogData.beforeUnloadCallback;
    this.dialogData.beforeUnloadCallback = () => {
      // Auto-save if the last clicked button is in the auto-save list
      if (
        this.dialogData._lastButtonId &&
        this.autoSaveButtonIds.has(this.dialogData._lastButtonId)
      ) {
        this.saveAllSettings();
      }

      // Call original callback if it exists
      if (originalBeforeUnloadCallback) {
        originalBeforeUnloadCallback();
      }
    };

    return super.open(title, windowFeatures);
  }

  /**
   * Set control value based on element type and value type.
   */
  private setControlValue(
    element: TagElementProps,
    value: any,
    _valueType: "string" | "number" | "boolean",
  ) {
    if (value === undefined || value === null) return;

    switch (element.tag) {
      case "input": {
        const inputType = element.attributes?.type || "text";
        if (inputType === "checkbox" || inputType === "radio") {
          element.attributes = {
            ...element.attributes,
            checked: Boolean(value),
          };
        } else {
          element.attributes = { ...element.attributes, value: String(value) };
        }
        break;
      }
      case "select":
        element.attributes = { ...element.attributes, value: String(value) };
        break;
      case "textarea":
        element.properties = { ...element.properties, value: String(value) };
        break;
      default:
        element.properties = {
          ...element.properties,
          textContent: String(value),
        };
    }
  }

  /**
   * Set control value on an actual DOM element.
   */
  private setControlValueOnElement(
    element: Element,
    value: any,
    _valueType: "string" | "number" | "boolean",
  ) {
    if (value === undefined || value === null) return;

    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case "input": {
        const inputElement = element as HTMLInputElement;
        if (inputElement.type === "checkbox" || inputElement.type === "radio") {
          inputElement.checked = Boolean(value);
        } else {
          inputElement.value = String(value);
        }
        break;
      }
      case "select":
        (element as HTMLSelectElement).value = String(value);
        break;
      case "textarea":
        (element as HTMLTextAreaElement).value = String(value);
        break;
      default:
        element.textContent = String(value);
    }
  }

  /**
   * Get control value from a DOM element with proper type conversion.
   */
  private getControlValue(
    element: Element,
    valueType: "string" | "number" | "boolean",
  ): any {
    const tagName = element.tagName.toLowerCase();
    let rawValue: string | boolean;

    switch (tagName) {
      case "input": {
        const inputElement = element as HTMLInputElement;
        if (inputElement.type === "checkbox" || inputElement.type === "radio") {
          rawValue = inputElement.checked;
        } else {
          rawValue = inputElement.value;
        }
        break;
      }
      case "select":
        rawValue = (element as HTMLSelectElement).value;
        break;
      case "textarea":
        rawValue = (element as HTMLTextAreaElement).value;
        break;
      default:
        rawValue = element.textContent || "";
    }

    // Convert to the appropriate type
    switch (valueType) {
      case "number":
        return typeof rawValue === "string" ? Number(rawValue) : rawValue;
      case "boolean":
        return typeof rawValue === "boolean" ? rawValue : Boolean(rawValue);
      case "string":
      default:
        return String(rawValue);
    }
  }
}
