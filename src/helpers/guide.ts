import { BasicTool } from "../basic";

/**
 * Helper for creating a guide.
 * Designed for creating a step-by-step guide for users.
 * @alpha
 */
export class GuideHelper extends BasicTool {
  _steps: GuideStep[] = [];

  constructor() {
    super();
  }

  addStep(step: GuideStep) {
    this._steps.push(step);
    return this;
  }

  addSteps(steps: GuideStep[]) {
    this._steps.push(...steps);
    return this;
  }

  async show(doc: Document) {
    if (!doc?.ownerGlobal) {
      throw new Error("Document is required.");
    }

    const guide = new Guide(doc.ownerGlobal);
    const autoHidePopup = Zotero.Prefs.get(
      "ui.popup.disable_autohide",
      true
    ) as boolean;
    Zotero.Prefs.set("ui.popup.disable_autohide", true, true);
    await guide.show(this._steps);
    const promise = new Promise((resolve) => {
      guide._panel.addEventListener("guide-finished", () => resolve(guide));
    });
    Zotero.Prefs.set("ui.popup.disable_autohide", autoHidePopup, true);
    return promise as Promise<Guide>;
  }

  async highlight(doc: Document, step: GuideStep) {
    if (!doc?.ownerGlobal) {
      throw new Error("Document is required.");
    }
    const guide = new Guide(doc.ownerGlobal);
    await guide.show([step]);
    const promise = new Promise((resolve) => {
      guide._panel.addEventListener("guide-finished", () => resolve(guide));
    });
    return promise as Promise<Guide>;
  }
}

type GuideStep = {
  element?: string | Element | (() => Element);
  title?: string;
  description?: string;
  position?:
    | "before_start"
    | "before_end"
    | "after_start"
    | "after_end"
    | "start_before"
    | "start_after"
    | "end_before"
    | "end_after"
    | "overlap"
    | "after_pointer"
    | "center";
  showButtons?: ("next" | "prev" | "close")[];
  showProgress?: boolean;
  disableButtons?: ("next" | "prev" | "close")[];
  progressText?: string;
  closeBtnText?: string;
  nextBtnText?: string;
  prevBtnText?: string;
  onBeforeRender?: GuideHook;
  onRender?: GuideHook;
  onExit?: GuideHook;
  onNextClick?: GuideHook;
  onPrevClick?: GuideHook;
  onCloseClick?: GuideHook;
  onMask?: (props: { mask: (elem: Element) => void }) => void;
};

type GuideHook = ({
  config,
  state,
}: {
  config: GuideStep;
  state: GuideState;
}) => any;

type GuideState = {
  step: number;
  steps: GuideStep[];
  controller: Guide;
};

class Guide {
  _window!: Window;
  _id = `guide-${Zotero.Utilities.randomString()}`;

  _panel!: XULPopupElement;
  _header!: HTMLDivElement;
  _body!: HTMLDivElement;
  _footer!: HTMLDivElement;
  _progress!: HTMLDivElement;
  _closeButton!: XUL.Button;
  _prevButton!: XUL.Button;
  _nextButton!: XUL.Button;
  _steps?: GuideStep[];

  _noClose!: boolean;
  _closed!: boolean;
  _autoNext!: boolean;
  _currentIndex!: number;

  initialized!: boolean;

  _cachedMasks = [] as WeakRef<Element>[];

  get content() {
    return this._window.MozXULElement.parseXULToFragment(`
      <panel id="${this._id}" class="guide-panel" type="arrow" align="top">
          <html:div class="guide-panel-content">
              <html:div class="guide-panel-header"></html:div>
              <html:div class="guide-panel-body"></html:div>
              <html:div class="guide-panel-footer">
                  <html:div class="guide-panel-progress"></html:div>
                  <html:div class="guide-panel-buttons">
                      <button id="prev-button" class="guide-panel-button" hidden="true"></button>
                      <button id="next-button" class="guide-panel-button" hidden="true"></button>
                      <button id="close-button" class="guide-panel-button" hidden="true"></button>
                  </html:div>
              </html:div>
          </html:div>
          <html:style>
              .guide-panel {
                  background-color: var(--material-menu);
                  color: var(--fill-primary);
              }
              .guide-panel-content {
                  display: flex;
                  flex-direction: column;
                  padding: 0;
              }
              .guide-panel-header {
                  font-size: 1.2em;
                  font-weight: bold;
                  margin-bottom: 10px;
              }
              .guide-panel-header:empty {
                display: none;
              }
              .guide-panel-body {
                  align-items: center;
                  display: flex;
                  flex-direction: column;
                  white-space: pre-wrap;
              }
              .guide-panel-body:empty {
                display: none;
              }
              .guide-panel-footer {
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                  justify-content: space-between;
                  margin-top: 10px;
              }
              .guide-panel-progress {
                  font-size: 0.8em;
              }
              .guide-panel-buttons {
                  display: flex;
                  flex-direction: row;
                  flex-grow: 1;
                  justify-content: flex-end;
              }
          </html:style>
      </panel>
  `);
  }

  get currentStep() {
    if (!this._steps) return undefined;
    return this._steps[this._currentIndex];
  }

  get currentTarget() {
    const step = this.currentStep;
    if (!step?.element) return undefined;

    let elem: Element;
    if (typeof step.element === "function") {
      elem = step.element();
    } else if (typeof step.element === "string") {
      elem = document.querySelector(step.element)!;
    } else if (!step.element) {
      elem = document.documentElement;
    } else {
      elem = step.element;
    }
    return elem;
  }

  get hasNext() {
    return this._steps && this._currentIndex < this._steps.length - 1;
  }

  get hasPrevious() {
    return this._steps && this._currentIndex > 0;
  }

  get hookProps(): Parameters<GuideHook>[0] {
    return {
      config: this.currentStep!,
      state: {
        step: this._currentIndex,
        steps: this._steps!,
        controller: this,
      },
    };
  }

  get panel() {
    return this._panel;
  }

  constructor(win: Window) {
    this._window = win;
    this._noClose = false;
    this._closed = false;
    this._autoNext = true;
    this._currentIndex = 0;

    const doc = win.document;

    let content = this.content;
    if (content) {
      doc.documentElement.append(doc.importNode(content, true));
    }

    this._panel = doc.querySelector(`#${this._id}`)!;
    this._header = this._panel.querySelector(".guide-panel-header")!;
    this._body = this._panel.querySelector(".guide-panel-body")!;
    this._footer = this._panel.querySelector(".guide-panel-footer")!;
    this._progress = this._panel.querySelector(".guide-panel-progress")!;
    this._closeButton = this._panel.querySelector("#close-button")!;
    this._prevButton = this._panel.querySelector("#prev-button")!;
    this._nextButton = this._panel.querySelector("#next-button")!;
    this._closeButton.addEventListener("click", async () => {
      if (this.currentStep?.onCloseClick) {
        await this.currentStep.onCloseClick(this.hookProps);
      }
      this.abort();
    });
    this._prevButton.addEventListener("click", async () => {
      if (this.currentStep?.onPrevClick) {
        await this.currentStep.onPrevClick(this.hookProps);
      }
      this.movePrevious();
    });
    this._nextButton.addEventListener("click", async () => {
      if (this.currentStep?.onNextClick) {
        await this.currentStep.onNextClick(this.hookProps);
      }
      this.moveNext();
    });
    this._panel.addEventListener("popupshown", this._handleShown.bind(this));
    this._panel.addEventListener("popuphidden", this._handleHidden.bind(this));
    this._window.addEventListener("resize", this._centerPanel);
  }

  async show(steps?: GuideStep[]) {
    if (steps) {
      this._steps = steps;
      this._currentIndex = 0;
    }
    let index = this._currentIndex;
    this._noClose = false;
    this._closed = false;
    this._autoNext = true;
    const step = this.currentStep;
    if (!step) return;
    const elem = this.currentTarget;
    if (step.onBeforeRender) {
      await step.onBeforeRender(this.hookProps);
      if (index !== this._currentIndex) {
        await this.show();
        return;
      }
    }
    if (step.onMask) {
      step.onMask({ mask: (_e: Element) => this._createMask(_e) });
    } else {
      this._createMask(elem);
    }
    let x,
      y = 0;
    let position = step.position || "after_start";
    if (position === "center") {
      position = "overlap";
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }
    this._panel.openPopup(
      elem,
      step.position || "after_start",
      x,
      y,
      false,
      false
    );
  }

  hide() {
    this._panel.hidePopup();
  }

  abort() {
    this._closed = true;
    this.hide();
    this._steps = undefined;
  }

  moveTo(stepIndex: number) {
    if (!this._steps) {
      this.hide();
      return;
    }
    if (stepIndex < 0) stepIndex = 0;
    if (!this._steps[stepIndex]) {
      this._currentIndex = this._steps.length;
      this.hide();
      return;
    }
    this._autoNext = false;
    this._noClose = true;
    this.hide();
    this._noClose = false;
    this._autoNext = true;
    this._currentIndex = stepIndex;
    this.show();
  }

  moveNext() {
    this.moveTo(this._currentIndex + 1);
  }

  movePrevious() {
    this.moveTo(this._currentIndex - 1);
  }

  _handleShown() {
    if (!this._steps) return;
    const step = this.currentStep;
    if (!step) return;
    this._header.innerHTML = step.title || "";
    this._body.innerHTML = step.description || "";
    (
      this._panel.querySelectorAll(
        ".guide-panel-button"
      ) as NodeListOf<HTMLButtonElement>
    ).forEach((elem) => {
      elem.hidden = true;
      elem.disabled = false;
    });
    let showButtons = step.showButtons;
    if (!showButtons) {
      showButtons = [];
      if (this.hasPrevious) {
        showButtons.push("prev");
      }
      if (this.hasNext) {
        showButtons.push("next");
      } else {
        showButtons.push("close");
      }
    }
    if (showButtons?.length) {
      showButtons.forEach((btn) => {
        (this._panel.querySelector(
          `#${btn}-button`
        ) as HTMLButtonElement)!.hidden = false;
      });
    }
    if (step.disableButtons) {
      step.disableButtons.forEach((btn) => {
        (this._panel.querySelector(
          `#${btn}-button`
        ) as HTMLButtonElement)!.disabled = true;
      });
    }
    if (step.showProgress) {
      this._progress.hidden = false;
      this._progress.textContent =
        step.progressText || `${this._currentIndex + 1}/${this._steps.length}`;
    } else {
      this._progress.hidden = true;
    }
    this._closeButton.label = step.closeBtnText || "Done";
    this._nextButton.label = step.nextBtnText || "Next";
    this._prevButton.label = step.prevBtnText || "Previous";
    if (step.onRender) {
      step.onRender(this.hookProps);
    }
    if (step.position === "center") {
      this._centerPanel();
      this._window.setTimeout(this._centerPanel, 10);
    }
  }

  async _handleHidden() {
    this._removeMask();
    this._header.innerHTML = "";
    this._body.innerHTML = "";
    this._progress.textContent = "";
    if (!this._steps) return;
    const step = this.currentStep;
    if (step && step.onExit) {
      await step.onExit(this.hookProps);
    }
    if (!this._noClose && (this._closed || !this.hasNext)) {
      this._panel.dispatchEvent(new this._window.CustomEvent("guide-finished"));
      this._panel.remove();
      this._window.removeEventListener("resize", this._centerPanel);
      return;
    }
    if (this._autoNext) {
      this.moveNext();
    }
  }

  _centerPanel = () => {
    const win = this._window;
    this._panel.moveTo(
      win.screenX + win.innerWidth / 2 - this._panel.clientWidth / 2,
      win.screenY + win.innerHeight / 2 - this._panel.clientHeight / 2
    );
  };

  _createMask(targetElement?: Element) {
    const doc = targetElement?.ownerDocument || this._window.document;
    const NS = "http://www.w3.org/2000/svg";

    const svg = doc.createElementNS(NS, "svg");
    svg.id = "guide-panel-mask";
    svg.style.position = "fixed";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.zIndex = "9999";

    const mask = doc.createElementNS(NS, "mask");
    mask.id = "mask";

    const fullRect = doc.createElementNS(NS, "rect");
    fullRect.setAttribute("x", "0");
    fullRect.setAttribute("y", "0");
    fullRect.setAttribute("width", "100%");
    fullRect.setAttribute("height", "100%");
    fullRect.setAttribute("fill", "white");

    mask.appendChild(fullRect);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const targetRect = doc.createElementNS(NS, "rect");
      targetRect.setAttribute("x", rect.left.toString());
      targetRect.setAttribute("y", rect.top.toString());
      targetRect.setAttribute("width", rect.width.toString());
      targetRect.setAttribute("height", rect.height.toString());
      targetRect.setAttribute("fill", "black");
      mask.appendChild(targetRect);
    }

    const maskedRect = doc.createElementNS(NS, "rect");
    maskedRect.setAttribute("x", "0");
    maskedRect.setAttribute("y", "0");
    maskedRect.setAttribute("width", "100%");
    maskedRect.setAttribute("height", "100%");
    maskedRect.setAttribute("mask", "url(#mask)");
    maskedRect.setAttribute("opacity", "0.7");

    svg.appendChild(mask);
    svg.appendChild(maskedRect);

    this._cachedMasks.push(new WeakRef(svg));
    doc.documentElement.appendChild(svg);
  }

  _removeMask() {
    this._cachedMasks.forEach((ref) => {
      const mask = ref.deref();
      if (mask) {
        mask.remove();
      }
    });
    this._cachedMasks = [];
  }
}
