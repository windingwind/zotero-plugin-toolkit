import { BasicTool, BasicOptions } from "../basic";
import { ManagerTool } from "../basic";
import { UITool } from "../_doc";
import ToolkitGlobal from "./toolkitGlobal";

/**
 * Prompt for setting up or executing some commands quickly.
 *
 * `Shift + P` can show/hide its UI anywhere after registering commands.
 */
export class Prompt {
  private keyset!: XUL.Element;
  private ui: UITool;
  private base: BasicTool;
  private document: Document;

  /**
   * Record the last text entered
   */
  private lastInputText = "";
  /**
   * Default text
   */
  private defaultText = {
    placeholder: "Select a command...",
    empty: "No commands found.",
  };
  /**
   * It controls the max line number of commands displayed in `commandsNode`.
   */
  private maxLineNum: number = 12;
  /**
   * The top-level HTML div node of `Prompt`
   */
  private promptNode!: HTMLDivElement;
  /**
   * The HTML input node of `Prompt`.
   */
  public inputNode!: HTMLInputElement;
  /**
   * Save all commands registered by all addons.
   */
  public commands: Command[] = [];
  /**
   * Initialize `Prompt` but do not create UI.
   */
  constructor() {
    this.base = new BasicTool();
    this.ui = new UITool();
    this.document = this.base.getGlobal("document");
  }

  /**
   * Initialize `Prompt` UI and then bind events on it.
   */
  public initializeUI() {
    this.addStyle();
    this.createHTML();
    this.initInputEvents();
    this.registerShortcut();
  }

  private createHTML() {
    this.promptNode = this.ui.createElement(this.document, "div", {
      id: `zotero-plugin-toolkit-prompt`,
      classList: ["prompt-container"],
      styles: {
        display: "none",
      },
      children: [
        {
          tag: "div",
          classList: ["input-container"],
          children: [
            {
              tag: "input",
              attributes: {
                type: "text",
                placeholder: this.defaultText.placeholder,
              },
            },
            {
              tag: "div",
              classList: ["cta"],
            },
          ],
        },
        {
          tag: "div",
          classList: ["commands-containers"],
        },
        {
          tag: "div",
          classList: ["instructions"],
          children: [
            {
              tag: "div",
              classList: ["instruction"],
              children: [
                {
                  tag: "span",
                  classList: ["key"],
                  properties: {
                    innerText: "↑↓",
                  },
                },
                {
                  tag: "span",
                  properties: {
                    innerText: "to navigate",
                  },
                },
              ],
            },
            {
              tag: "div",
              classList: ["instruction"],
              children: [
                {
                  tag: "span",
                  classList: ["key"],
                  properties: {
                    innerText: "enter",
                  },
                },
                {
                  tag: "span",
                  properties: {
                    innerText: "to trigger",
                  },
                },
              ],
            },
            {
              tag: "div",
              classList: ["instruction"],
              children: [
                {
                  tag: "span",
                  classList: ["key"],
                  properties: {
                    innerText: "esc",
                  },
                },
                {
                  tag: "span",
                  properties: {
                    innerText: "to exit",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    this.inputNode = this.promptNode.querySelector("input")!;

    this.document.documentElement.appendChild(this.promptNode);
  }

  /**
   * Show commands in a new `commandsContainer`
   * All other `commandsContainer` is hidden
   * @param commands Command[]
   * @param clear remove all `commandsContainer` if true
   */
  public showCommands(commands: Command[], clear: boolean = false) {
    if (clear) {
      this.promptNode
        .querySelectorAll(".commands-container")
        .forEach((e: any) => e.remove());
    }
    this.inputNode.placeholder = this.defaultText.placeholder;
    const commandsContainer = this.createCommandsContainer();
    for (let command of commands) {
      if (command.when && !command.when()) {
        continue;
      }
      commandsContainer.appendChild(this.createCommandNode(command));
    }
  }

  /**
   * Create a `commandsContainer` div element, append to `commandsContainer` and hide others.
   * @returns commandsNode
   */
  public createCommandsContainer() {
    const commandsContainer = this.ui.createElement(this.document, "div", {
      classList: ["commands-container"],
    });
    // Add to container and hide others
    this.promptNode
      .querySelectorAll(".commands-container")
      .forEach((e: any) => {
        e.style.display = "none";
      });
    this.promptNode
      .querySelector(".commands-containers")!
      .appendChild(commandsContainer);
    return commandsContainer;
  }

  /**
   * Return current displayed `commandsContainer`
   * @returns
   */
  private getCommandsContainer() {
    return [...this.promptNode.querySelectorAll(".commands-container")].find(
      (e: any) => {
        return e.style.display != "none";
      }
    ) as HTMLDivElement;
  }

  /**
   * Create a command item with passed name and label for `Prompt` UI.
   *
   * Should append it to `commandsNode` manually.
   */
  public createCommandNode(command: Command): HTMLElement {
    const commandNode = this.ui.createElement(this.document, "div", {
      classList: ["command"],
      children: [
        {
          tag: "div",
          classList: ["content"],
          children: [
            {
              tag: "div",
              classList: ["name"],
              children: [
                {
                  tag: "span",
                  properties: {
                    innerText: command.name,
                  },
                },
              ],
            },
            {
              tag: "div",
              classList: ["aux"],
              children: command.label
                ? [
                    {
                      tag: "span",
                      classList: ["label"],
                      properties: {
                        innerText: command.label,
                      },
                    },
                  ]
                : [],
            },
          ],
        },
      ],
      listeners: [
        {
          type: "mousemove",
          listener: () => {
            this.selectItem(commandNode);
          },
        },
        {
          type: "click",
          listener: async () => {
            if (Array.isArray(command.callback)) {
              this.showCommands(command.callback);
            } else {
              await command.callback(this);
            }
          },
        },
      ],
    });
    return commandNode;
  }

  /**
   * Called when `enter` key is pressed.
   */
  public trigger() {
    (
      [...this.promptNode.querySelectorAll(".commands-container")]
        .find((e: any) => e.style.display != "none")!
        .querySelector(".selected") as HTMLDivElement
    ).click();
  }

  /**
   * Called when `escape` key is pressed.
   */
  public exit() {
    this.inputNode.placeholder = this.defaultText.placeholder;
    if (
      this.promptNode.querySelectorAll(
        ".commands-containers .commands-container"
      ).length >= 2
    ) {
      (
        this.promptNode.querySelector(
          ".commands-container:last-child"
        ) as HTMLDivElement
      ).remove();
      const commandsContainer = this.promptNode.querySelector(
        ".commands-container:last-child"
      ) as HTMLDivElement;
      commandsContainer.style.display = "";
      commandsContainer
        .querySelectorAll(".commands")
        .forEach((e: any) => (e.style.display = "flex"));
      this.inputNode.focus();
    } else {
      this.promptNode.style.display = "none";
    }
  }

  /**
   * Bind events of pressing `keydown` and `keyup` key.
   */
  private initInputEvents() {
    this.promptNode.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown"].indexOf(event.key) != -1) {
        event.preventDefault();
        // get selected item and index
        let selectedIndex;
        let allItems = [
          ...this.getCommandsContainer().querySelectorAll(".command"),
        ].filter((e: any) => e.style.display != "none");
        selectedIndex = allItems.findIndex((e) =>
          e.classList.contains("selected")
        );
        if (selectedIndex != -1) {
          allItems[selectedIndex].classList.remove("selected");
          selectedIndex += event.key == "ArrowUp" ? -1 : 1;
        } else {
          if (event.key == "ArrowUp") {
            selectedIndex = allItems.length - 1;
          } else {
            selectedIndex = 0;
          }
        }
        if (selectedIndex == -1) {
          selectedIndex = allItems.length - 1;
        } else if (selectedIndex == allItems.length) {
          selectedIndex = 0;
        }
        allItems[selectedIndex].classList.add("selected");
        let exceedNum = selectedIndex - this.maxLineNum + 2;
        let commandsContainer = this.getCommandsContainer();
        if (exceedNum > 0) {
          commandsContainer.scrollTo(
            0,
            (commandsContainer.querySelector(".selected") as HTMLElement)
              .offsetTop -
              commandsContainer.offsetHeight -
              15
          );
        } else {
          commandsContainer.scrollTop = 0;
        }
        allItems[selectedIndex].classList.add("selected");
      }
    });

    this.promptNode.addEventListener("keyup", async (event) => {
      if (event.key == "Enter") {
        this.trigger();
      } else if (event.key == "Escape") {
        if (this.inputNode.value.length > 0) {
          this.inputNode.value = "";
          return;
        }
        this.exit();
      }
      if (this.inputNode.value == this.lastInputText) {
        return;
      }
      let commandsContainer = this.getCommandsContainer();
      let tipNode = commandsContainer.querySelector(".tip");
      if (tipNode) {
        this.exit();
        commandsContainer = this.getCommandsContainer();
      }
      commandsContainer
        .querySelectorAll(".command .name span")
        .forEach((spanNode: any) => {
          spanNode.innerText = spanNode.innerText;
        });
      if (this.inputNode.value.trim().length == 0) {
        [...commandsContainer.querySelectorAll(".command")].forEach(
          (e: any) => {
            e.style.display = "flex";
          }
        );
      }
      this.lastInputText = this.inputNode.value;

      let inputText = this.inputNode.value.replace(/\s+/g, "");
      let matchedArray: any[][] = [];
      commandsContainer
        .querySelectorAll(".command")
        .forEach((commandNode: any) => {
          let spanNode = commandNode.querySelector(".name span") as HTMLElement;
          let spanHTML = spanNode.innerText;
          let matchedNum = 0;
          let innerHTML = "";
          let tightness = 0;
          let lasti = undefined;
          for (let i = 0; i < spanHTML.length; i++) {
            if (
              inputText[matchedNum].toLowerCase() == spanHTML[i].toLowerCase()
            ) {
              if (lasti == undefined) {
                lasti = i;
              }
              tightness += i - lasti;
              matchedNum++;
              innerHTML += `<span class="highlight">${spanHTML[i]}</span>`;
            } else {
              innerHTML += spanHTML[i];
            }
            if (matchedNum == inputText.length) {
              innerHTML += spanHTML.slice(i + 1);
              try {
                spanNode.innerHTML = innerHTML;
              } catch {
                spanNode.innerHTML = spanHTML;
              }
              matchedArray.push([
                tightness,
                commandNode,
                commandNode.innerText,
              ]);
              break;
            }
          }
          commandNode.style.display = "none";
          commandNode.classList.remove("selected");
        });
      // select the first 3
      matchedArray = matchedArray.sort((x, y) => y[0] - x[0]).slice(-3);
      // compute rmse
      let tightnessArray = matchedArray.map((e) => e[0]);
      // mean
      let s = 0;
      for (let i = 0; i < tightnessArray.length; i++) {
        s += tightnessArray[i];
      }
      let mean = s / tightnessArray.length;
      // variance
      let v = 0;
      for (let i = 0; i < tightnessArray.length; i++) {
        v += (mean - tightnessArray[i]) ** 2;
      }
      v = v / tightnessArray.length;
      if (v > 200) {
        matchedArray = matchedArray.slice(-1);
      }
      matchedArray.forEach((arr) => (arr[1].style.display = "flex"));
      if (matchedArray.length > 0) {
        matchedArray[0][1].classList.add("selected");
      } else {
        this.showTip(this.defaultText.empty);
      }
    });
  }

  /**
   * Create a commandsContainer and display a text
   */
  public showTip(text: string) {
    const tipNode = this.ui.createElement(this.document, "div", {
      classList: ["tip"],
      properties: {
        innerText: text,
      },
    });
    this.createCommandsContainer().appendChild(tipNode);
    return tipNode;
  }

  /**
   * Mark the selected item with class `selected`.
   * @param item HTMLDivElement
   */
  private selectItem(item: HTMLDivElement) {
    this.getCommandsContainer()
      .querySelectorAll(".command")
      .forEach((e) => e.classList.remove("selected"));
    item.classList.add("selected");
  }

  private addStyle() {
    const style = this.ui.createElement(this.document, "style", {
      id: "prompt-style",
    });
    style.innerText = `
      .prompt-container * {
        box-sizing: border-box;
      }
      .prompt-container {
        ---radius---: 10px;
        position: fixed;
        left: 25%;
        top: 10%;
        width: 50%;
        border-radius: var(---radius---);
        border: 1px solid #bdbdbd;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: white;
        font-size: 18px;
        box-shadow: 0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
                    0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
                    0px 30px 90px rgba(0, 0, 0, 0.2);
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
      }
      
      /* input */
      .prompt-container .input-container  {
        width: 100%;
      }
      
      .input-container input {
        width: 100%;
        height: 40px;
        padding: 24px;
        border-radius: 50%;
        border: none;
        outline: none;
        font-size: 18px;
      }
      
      .input-container .cta {
        border-bottom: 1px solid #f6f6f6;  
        margin: 5px auto;
      }
      
      /* results */
      .commands-containers {
        width: 100%;
        height: 100%;
      }
      .commands-container {
        max-height: calc(${this.maxLineNum} * 35.5px);
        width: calc(100% - 12px);
        margin-left: 12px;
        margin-right: 0%;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      .commands-container .command {
        display: flex;
        align-content: baseline;
        justify-content: space-between;
        border-radius: 5px;
        padding: 6px 12px;
        margin-right: 12px;
        margin-top: 2px;
        margin-bottom: 2px;
      }
      .commands-container .command .content {
        display: flex;
        width: 100%;
        justify-content: space-between;
        flex-direction: row;
        overflow: hidden;
      }
      .commands-container .command .content .name {
        white-space: nowrap; 
        text-overflow: ellipsis;
        overflow: hidden;
      }
      .commands-container .command .content .aux {
        display: flex;
        align-items: center;
        align-self: center;
        flex-shrink: 0;
      }
      
      .commands-container .command .content .aux .label {
        font-size: 15px;
        color: #5a5a5a;
        padding: 2px 6px;
        background-color: #fafafa;
        border-radius: 5px;
      }
      
      .commands-container .selected {
          background-color: rgba(0, 0, 0, 0.075);
      }

      .commands-container .highlight {
        font-weight: bold;
      }

      .tip {
        color: #5a5a5a;
        text-align: center;
        padding: 12px 12px;
        font-size: 18px;
      }
      
      .current-value {
        background-color: #a7b8c1;
        color: white;
        border-radius: 5px;
        padding: 0 5px;
        margin-left: 10px;
        font-size: 14px;
        vertical-align: middle;
        letter-spacing: 0.05em;
      }

      /* instructions */
      .instructions {
        display: flex;
        align-content: center;
        justify-content: center;
        font-size: 15px;
        color: rgba(0, 0, 0, 0.4);
        height: 2.5em;
        width: 100%;
        border-top: 1px solid #f6f6f6;
        margin-top: 5px;
      }
      
      .instructions .instruction {
        margin: auto .5em;  
      }
      
      .instructions .key {
        margin-right: .2em;
        font-weight: 600;
      }
    `;
    this.document.documentElement.appendChild(style);
  }

  private removeKeys() {
    if (this.keyset) {
      this.keyset.remove();
    }
  }

  private registerShortcut() {
    this.removeKeys();
    let keyset = document.createElement("keyset") as XUL.Element;
    keyset.setAttribute("id", "toolkit-keyset");

    let key = document.createElement("key");
    key.setAttribute("id", "toolkit-prompt-key");
    key.setAttribute("oncommand", "console.log(1)");
    key.addEventListener("command", function () {
      let Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
        Components.interfaces.nsISupports
      ).wrappedJSObject;
      const prompt = Zotero._toolkitGlobal.prompt;
      let promptNode = prompt.promptNode;
      let inputNode = prompt.inputNode;
      if (promptNode.style.display == "none") {
        promptNode.style.display = "flex";
        inputNode.focus();
        prompt.showCommands(prompt.commands, true);
      } else {
        promptNode.style.display = "none";
      }
    });
    key.setAttribute("key", "p");
    key.setAttribute("modifiers", "shift");
    keyset.appendChild(key);
    this.keyset = keyset;
    document.getElementById("mainKeyset")!.parentNode!.appendChild(keyset);
  }
}

export class PromptManager extends ManagerTool {
  private prompt: Prompt;
  /**
   * Save the commands registered from this manager
   */
  private commands: Command[] = [];
  constructor(base?: BasicTool | BasicOptions) {
    super(base);
    this.prompt = ToolkitGlobal.getInstance().prompt;
  }

  /**
   * Register commands. Don't forget to call `unregister` on plugin exit.
   * @param commands Command[]
   * @example
   * ```ts
   * let getReader = () => {
   *   return BasicTool.getZotero().Reader.getByTabID(
   *     (Zotero.getMainWindow().Zotero_Tabs).selectedID
   *   )
   * }
   *
   * register([
   *   {
   *     name: "Split Horizontally",
   *     label: "Zotero",
   *     when: () => getReader() as boolean,
   *     callback: (prompt: Prompt) => getReader().menuCmd("splitHorizontally")
   *   },
   *   {
   *     name: "Split Vertically",
   *     label: "Zotero",
   *     when: () => getReader() as boolean,
   *     callback: (prompt: Prompt) => getReader().menuCmd("splitVertically")
   *   }
   * ])
   * ```
   */
  public register(
    commands: {
      name: string;
      label?: string;
      when?: () => boolean;
      callback:
        | ((prompt: Prompt) => Promise<void>)
        | ((prompt: Prompt) => void)
        | Command[];
    }[]
  ) {
    this.prompt.initializeUI();
    // this.prompt.commands records all commands by all addons
    this.prompt.commands = [...this.prompt.commands, ...commands];
    // this.commands records all commands by the addon creating this PromptManager
    this.commands = [...this.commands, ...commands];
    this.prompt.showCommands(this.commands, true);
  }

  /**
   * You can delete a command registed before by its name.
   * @remarks
   * There is a premise here that the names of all commands registered by a single plugin are not duplicated.
   * @param name Command.name
   */
  public unregister(name: string) {
    // Delete it in this.prompt.commands
    this.prompt.commands = this.prompt.commands.filter((c) => {
      JSON.stringify(this.commands.find((c) => c.name == name)) !=
        JSON.stringify(c);
    });
    // Delete it in this.commands
    this.commands = this.commands.filter((c) => c.name != name);
  }

  /**
   * Call `unregisterAll` on plugin exit.
   */
  public unregisterAll() {
    this.prompt.commands = this.prompt.commands.filter((c) => {
      return this.commands.every((_c) => {
        JSON.stringify(_c) != JSON.stringify(c);
      });
    });
    this.commands = [];
  }
}

export interface Command {
  name: string;
  label?: string;
  when?: () => boolean;
  callback:
    | ((prompt: Prompt) => Promise<void>)
    | ((prompt: Prompt) => void)
    | Command[];
}
