import { BasicTool, BasicOptions } from "../basic";
import { ManagerTool } from "../basic";
import { UITool } from "../tools/ui";
import ToolkitGlobal, { GlobalInstance } from "./toolkitGlobal";

/**
 * Prompt for setting up or executing some commands quickly.
 *
 * `Shift + P` can show/hide its UI anywhere after registering commands.
 */
export class Prompt {
  private ui: UITool;
  private base: BasicTool;
  public get document(): Document {
    return this.base.getGlobal("document");
  }
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
   * It controls the max number of suggestions.
   */
  private maxSuggestionNum: number = 100;
  /**
   * The top-level HTML div node of `Prompt`
   */
  public promptNode!: HTMLDivElement;
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
    this.initializeUI();
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
      styles: {
        display: "none",
      },
      children: [
        {
          tag: "div",
          styles: {
            position: "fixed",
            left: "0",
            top: "0",
            backgroundColor: "transparent",
            width: "100%",
            height: "100%",
          },
          listeners: [
            {
              type: "click",
              listener: () => {
                this.promptNode.style.display = "none";
              },
            },
          ],
        },
      ],
    });
    this.promptNode.appendChild(
      this.ui.createElement(this.document, "div", {
        id: `zotero-plugin-toolkit-prompt`,
        classList: ["prompt-container"],
        children: [
          {
            tag: "div",
            classList: ["input-container"],
            children: [
              {
                tag: "input",
                classList: ["prompt-input"],
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
      })
    );

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
      /**
       * Filter out anonymous commands
       */
      try {
        if (!command.name || (command.when && !command.when())) {
          continue;
        }
      } catch {
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
    return [
      ...Array.from(this.promptNode.querySelectorAll(".commands-container")),
    ].find((e: any) => {
      return e.style.display != "none";
    }) as HTMLDivElement;
  }

  /**
   * Create a command item for `Prompt` UI.
   * @param command
   * @returns
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
            await this.execCallback(command.callback);
          },
        },
      ],
    });
    // @ts-ignore
    commandNode.command = command;
    return commandNode;
  }

  /**
   * Called when `enter` key is pressed.
   */
  private trigger() {
    (
      [...Array.from(this.promptNode.querySelectorAll(".commands-container"))]
        .find((e: any) => e.style.display != "none")!
        .querySelector(".selected") as HTMLDivElement
    ).click();
  }

  /**
   * Called when `escape` key is pressed.
   */
  private exit() {
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

  private async execCallback(callback: Command["callback"]) {
    if (Array.isArray(callback)) {
      this.showCommands(callback as Command[]);
    } else {
      await callback(this);
    }
  }
  /**
   * Match suggestions for user's entered text.
   */
  private async showSuggestions(inputText: string) {
    // From Obsidian
    var _w =
        /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/,
      jw = /\s/,
      Ww =
        /[\u0F00-\u0FFF\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

    function Yw(e: any, t: any, n: any, i: any) {
      if (0 === e.length) return 0;
      var r = 0;
      (r -= Math.max(0, e.length - 1)), (r -= i / 10);
      var o = e[0][0];
      return (
        (r -= (e[e.length - 1][1] - o + 1 - t) / 100),
        (r -= o / 1e3),
        (r -= n / 1e4)
      );
    }

    function $w(e: any, t: any, n: any, i: any) {
      if (0 === e.length) return null;
      for (
        var r = n.toLowerCase(), o = 0, a = 0, s = [], l = 0;
        l < e.length;
        l++
      ) {
        var c = e[l],
          u = r.indexOf(c, a);
        if (-1 === u) return null;
        var h = n.charAt(u);
        if (u > 0 && !_w.test(h) && !Ww.test(h)) {
          var p = n.charAt(u - 1);
          if (
            (h.toLowerCase() !== h && p.toLowerCase() !== p) ||
            (h.toUpperCase() !== h && !_w.test(p) && !jw.test(p) && !Ww.test(p))
          )
            if (i) {
              if (u !== a) {
                (a += c.length), l--;
                continue;
              }
            } else o += 1;
        }
        if (0 === s.length) s.push([u, u + c.length]);
        else {
          var d = s[s.length - 1];
          d[1] < u ? s.push([u, u + c.length]) : (d[1] = u + c.length);
        }
        a = u + c.length;
      }
      return {
        matches: s,
        score: Yw(s, t.length, r.length, o),
      };
    }

    function Gw(e: any): { query: string; tokens: string[]; fuzzy: string[] } {
      for (var t = e.toLowerCase(), n = [], i = 0, r = 0; r < t.length; r++) {
        var o = t.charAt(r);
        jw.test(o)
          ? (i !== r && n.push(t.substring(i, r)), (i = r + 1))
          : (_w.test(o) || Ww.test(o)) &&
            (i !== r && n.push(t.substring(i, r)), n.push(o), (i = r + 1));
      }
      return (
        i !== t.length && n.push(t.substring(i, t.length)),
        {
          query: e,
          tokens: n,
          fuzzy: t.split(""),
        }
      );
    }

    function Xw(e: any, t: any): { matches: number[][]; score: number } | null {
      if ("" === e.query)
        return {
          score: 0,
          matches: [],
        };
      var n = $w(e.tokens, e.query, t, !1);
      return n || $w(e.fuzzy, e.query, t, !0);
    }
    var e = Gw(inputText);
    let container = this.getCommandsContainer();
    if (container.classList.contains("suggestions")) {
      this.exit();
    }
    if (inputText.trim() == "") {
      return true;
    }
    let suggestions: {
      score: number;
      commandNode: HTMLDivElement;
    }[] = [];
    this.getCommandsContainer()
      .querySelectorAll(".command")
      .forEach((commandNode: any) => {
        let spanNode = commandNode.querySelector(".name span") as HTMLElement;
        let spanText = spanNode.innerText;
        let res = Xw(e, spanText);
        if (res) {
          commandNode = this.createCommandNode(commandNode.command);
          let spanHTML = "";
          let i = 0;
          for (let j = 0; j < res.matches.length; j++) {
            let [start, end] = res.matches[j];
            if (start > i) {
              spanHTML += spanText.slice(i, start);
            }
            spanHTML += `<span class="highlight">${spanText.slice(
              start,
              end
            )}</span>`;
            i = end;
          }
          if (i < spanText.length) {
            spanHTML += spanText.slice(i, spanText.length);
          }
          commandNode.querySelector(".name span").innerHTML = spanHTML;
          suggestions.push({ score: res.score, commandNode });
        }
      });
    if (suggestions.length > 0) {
      suggestions
        .sort((a, b) => b.score - a.score)
        .slice(this.maxSuggestionNum);
      container = this.createCommandsContainer();
      container.classList.add("suggestions");
      suggestions.forEach((suggestion) => {
        container.appendChild(suggestion.commandNode);
      });
      return true;
    } else {
      const anonymousCommand = this.commands.find(
        (c) => !c.name && (!c.when || c.when!())
      );
      if (anonymousCommand) {
        await this.execCallback(anonymousCommand.callback);
      } else {
        this.showTip(this.defaultText.empty);
      }
      return false;
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
          ...Array.from(
            this.getCommandsContainer().querySelectorAll(".command")
          ),
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
        let commandsContainer = this.getCommandsContainer();
        commandsContainer.scrollTo(
          0,
          (commandsContainer.querySelector(".selected") as HTMLElement)
            .offsetTop -
            commandsContainer.offsetHeight +
            7.5
        );
        allItems[selectedIndex].classList.add("selected");
      }
    });

    this.promptNode.addEventListener("keyup", async (event) => {
      if (event.key == "Enter") {
        this.trigger();
      } else if (event.key == "Escape") {
        if (this.inputNode.value.length > 0) {
          this.inputNode.value = "";
        } else {
          this.exit();
        }
      } else if (["ArrowUp", "ArrowDown"].indexOf(event.key) != -1) {
        return;
      }
      const currentInputText = this.inputNode.value;
      if (currentInputText == this.lastInputText) {
        return;
      }
      this.lastInputText = currentInputText;
      window.setTimeout(async () => {
        await this.showSuggestions(currentInputText);
      });
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
    let container = this.createCommandsContainer();
    container.classList.add("suggestions");
    container.appendChild(tipNode);
    return tipNode;
  }

  /**
   * Mark the selected item with class `selected`.
   * @param item HTMLDivElement
   */
  public selectItem(item: HTMLDivElement) {
    this.getCommandsContainer()
      .querySelectorAll(".command")
      .forEach((e) => e.classList.remove("selected"));
    item.classList.add("selected");
  }

  private addStyle() {
    const style = this.ui.createElement(this.document, "style", {
      namespace: "html",
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
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 18px;
        box-shadow: 0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
                    0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
                    0px 30px 90px rgba(0, 0, 0, 0.2);
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Microsoft YaHei Light", sans-serif;
        background-color: var(--material-background) !important;
        border: var(--material-border-quarternary) !important;
      }
      
      /* input */
      .prompt-container .input-container  {
        width: 100%;
      }

      .input-container input {
        width: -moz-available;
        height: 40px;
        padding: 24px;
        border: none;
        outline: none;
        font-size: 18px;
        margin: 0 !important;
        border-radius: var(---radius---);
        background-color: var(--material-background);
      }
      
      .input-container .cta {
        border-bottom: var(--material-border-quarternary);
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
        color: var(--fill-primary);
        padding: 2px 6px;
        background-color: var(--color-background);
        border-radius: 5px;
      }
      
      .commands-container .selected {
          background-color: var(--material-mix-quinary);
      }

      .commands-container .highlight {
        font-weight: bold;
      }

      .tip {
        color: var(--fill-primary);
        text-align: center;
        padding: 12px 12px;
        font-size: 18px;
      }

      /* instructions */
      .instructions {
        display: flex;
        align-content: center;
        justify-content: center;
        font-size: 15px;
        height: 2.5em;
        width: 100%;
        border-top: var(--material-border-quarternary);
        color: var(--fill-secondary);
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

  private registerShortcut() {
    this.document.addEventListener(
      "keydown",
      (event: any) => {
        if (event.shiftKey && event.key.toLowerCase() == "p") {
          if (
            event.originalTarget.isContentEditable ||
            "value" in event.originalTarget ||
            this.commands.length == 0
          ) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          if (this.promptNode.style.display == "none") {
            this.promptNode.style.display = "flex";
            if (
              this.promptNode.querySelectorAll(".commands-container").length ==
              1
            ) {
              this.showCommands(this.commands, true);
            }
            this.promptNode.focus();
            this.inputNode.focus();
          } else {
            this.promptNode.style.display = "none";
          }
        }
      },
      true
    );
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
    const globalCache = ToolkitGlobal.getInstance().prompt;
    if (!globalCache._ready) {
      globalCache._ready = true;
      globalCache.instance = new Prompt();
    }
    this.prompt = globalCache.instance!;
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
      name?: string;
      label?: string;
      id?: string;
      when?: () => boolean;
      callback:
        | ((prompt: Prompt) => Promise<void>)
        | ((prompt: Prompt) => void)
        | Command[];
    }[]
  ) {
    // id->name
    commands.forEach((c) => (c.id ??= c.name));
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
   * @param id Command.name
   */
  public unregister(id: string) {
    // Delete it in this.prompt.commands
    this.prompt.commands = this.prompt.commands.filter((c) => c.id != id);
    // Delete it in this.commands
    this.commands = this.commands.filter((c) => c.id != id);
  }

  /**
   * Call `unregisterAll` on plugin exit.
   */
  public unregisterAll() {
    this.prompt.commands = this.prompt.commands.filter((c) => {
      return this.commands.every((_c) => _c.id != c.id);
    });
    this.commands = [];
  }
}

export interface Command {
  name?: string;
  label?: string;
  id?: string;
  when?: () => boolean;
  callback:
    | ((prompt: Prompt) => Promise<void>)
    | ((prompt: Prompt) => void)
    | Command[];
}

export interface PromptGlobal extends GlobalInstance {
  instance: Prompt | undefined;
}
