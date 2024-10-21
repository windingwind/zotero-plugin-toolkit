/* eslint-disable no-restricted-globals */
function randomJobID() {
  return `${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
}

function getProperty(obj: any, path: string) {
  if (path === "") {
    return obj;
  }
  const parts = path.split(".");
  let value = obj;
  for (const part of parts) {
    value = value[part];
    if (typeof value === "undefined") {
      throw new TypeError(`Property ${path} not found`);
    }
  }
  return value;
}

function logError(e: any) {
  if (typeof self !== "undefined") {
    self.console.warn(e);
  } else if (typeof console !== "undefined") {
    console.warn(e);
  } else if (typeof Zotero !== "undefined") {
    Zotero.warn(e);
  }
}

type MessageParams<T extends MessageHandlers> = {
  [K in keyof T]: T[K] extends (params: infer P) => void ? P : never;
};

type MessageReturnType<T extends MessageHandlers> = {
  [K in keyof T]: T[K] extends (params: any) => infer R ? R : never;
};

interface MessageHandlers {
  [key: string]: (data?: any) => Promise<any>;
}

// eslint-disable-next-line unused-imports/no-unused-vars
type GenerateMessageHandlerInterface<T extends MessageHandlers> = {
  [K in keyof T]: T[K];
};

interface MessageServerConfig {
  name: string;
  handlers: MessageHandlers;
  target?: Window | Worker;
  dev?: boolean;
  canBeDestroyed?: boolean;
  returnStatus?: boolean;
}

interface BuiltInMessageHandlers {
  _start: () => Promise<void>;
  _stop: () => Promise<void>;
  _destroy: () => Promise<void>;
  _ping: () => Promise<void>;
  _call: (data: { func: string; args: any[] }) => Promise<any>;
  _get: (data: { key: string }) => Promise<any>;
  _set: (data: { key: string; value: any }) => Promise<void>;
}

/**
 * MessageServerHelper
 * @alpha
 */
export class MessageServerHelper<_TargetHandlers extends MessageHandlers> {
  protected config: Required<MessageServerConfig>;

  protected env: "webworker" | "chromeworker" | "browser" | "content";

  protected listener?: any;

  public running = false;

  get target() {
    return this.config.target;
  }

  get privileged() {
    return ["browser", "chromeworker"].includes(this.env);
  }

  constructor(config: MessageServerConfig) {
    if (!config.target) {
      config.target = self;
    }

    if (typeof config.dev === "undefined") {
      config.dev = false;
    }

    this.config = config as Required<MessageServerConfig>;

    this.config.handlers = {
      ...this.config.handlers,
      _start: async () => {
        this.start();
      },
      _stop: async () => {
        this.stop();
      },
      _destroy: async () => {
        this.destroy();
      },
      _ping: async () => {
        return "pong";
      },
      _call: async (data: { func: string; args: any[] }) => {
        const { func, args } = data;
        const funcObj = getProperty(self, func);
        return await funcObj(...args);
      },
      _get: async (data: { key: string }) => {
        const { key } = data;
        return await getProperty(self, key);
      },
      _set: async (data: { key: string; value: any }) => {
        const { key, value } = data;
        const parts = key.split(".");
        const last = parts.pop()!;
        const obj = getProperty(self, parts.join("."));
        obj[last] = value;
      },
      _eval: async (data: { code: string }) => {
        const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
        const fn = new AsyncFunction("self", data.code);
        return await fn(self);
      },
    };

    this.config.target.addEventListener(
      "unload",
      () => {
        this.destroy();
      },
      { once: true },
    );

    // Infer environment
    if (typeof window !== "undefined") {
      if (typeof window.browsingContext !== "undefined") {
        this.env = "browser";
      } else {
        this.env = "content";
      }
    } else {
      // @ts-expect-error - ctypes is not defined
      if (typeof ctypes !== "undefined") {
        this.env = "chromeworker";
      } else {
        this.env = "webworker";
      }
    }
  }

  start() {
    if (this.running) {
      logError(`Listener already started for ${this.config.name}`);
      return;
    }
    if (!this.listener) {
      this.listener = async (event: MessageEvent) => {
        const { data } = event;
        if (typeof data !== "object" || data === null) {
          return;
        }
        const {
          _jobID,
          _senderName,
          _handlerName,
          _handlerSuccess,
          _handlerData,
          _requestReturn,
        } = data;
        // Ignore message from self
        if (_senderName === this.config.name) {
          return;
        }

        if (!this.running && _handlerName !== "_start") {
          logError(
            `Server not started for ${this.config.name}, ignoring message ${_handlerName}`,
          );
          return;
        }

        const handler = this.config.handlers[_handlerName];
        if (!handler) {
          // Only log error if it's not a return message
          if (!_handlerName.endsWith("::return")) {
            logError(
              `Handler ${_handlerName} not found for ${this.config.name}`,
            );
          }
          return;
        }
        try {
          // Expose handler success to handler if it's an object
          if (this.config.returnStatus && typeof _handlerData === "object") {
            _handlerData._handlerSuccess = _handlerSuccess;
          }
          const res = await handler(_handlerData);
          if (_requestReturn) {
            this.send({
              name: `${_handlerName}::return`,
              data: res,
              jobID: _jobID,
              requestReturn: false,
            });
          }
        } catch (e) {
          logError(
            `Error in handler ${_handlerName} for ${this.config.name}, ${e}`,
          );
          if (_requestReturn) {
            this.send({
              name: `${_handlerName}::return`,
              data: String(e),
              jobID: _jobID,
              success: false,
              requestReturn: false,
            });
          }
        }
      };
    }

    this.config.target?.addEventListener("message", this.listener);

    this.running = true;
  }

  stop() {
    if (!this.running) {
      logError(`Listener already stopped for ${this.config.name}`);
      return;
    }
    this.running = false;
  }

  destroy() {
    this.stop();
    if (!this.listener) {
      logError(`Listener already destroyed for ${this.config.name}`);
      return;
    }
    this.config.target?.removeEventListener("message", this.listener);
    if (this.config.canBeDestroyed && this.config.target === self) {
      if (this.config.dev) {
        logError(`Destroying window ${this.config.name}`);
      }
      self.close();
    }
  }

  async exec<
    _HandlersName extends keyof MessageParams<_HandlersType>,
    _HandlersType extends _TargetHandlers & BuiltInMessageHandlers,
  >(
    name: _HandlersName,
    params?: MessageParams<_HandlersType>[_HandlersName],
    options: {
      timeout?: number;
    } = {},
  ): Promise<Awaited<MessageReturnType<_HandlersType>[_HandlersName]>> {
    const { timeout = 5000 } = options;
    let resolved = false;
    const target = this.config.target;

    // Send the message
    const jobID = await this.send({ name: name as string, data: params });
    const returnStatus = this.config.returnStatus;
    return new Promise((resolve) => {
      const handler = function (event: MessageEvent) {
        if (resolved) {
          return;
        }
        const {
          _handlerName,
          _jobID: returnJobID,
          _handlerData,
          _handlerSuccess,
        } = event.data;
        if (
          _handlerName !== `${name as string}::return` ||
          returnJobID !== jobID
        ) {
          return;
        }
        resolved = true;
        // eslint-disable-next-line ts/no-use-before-define
        clearTimeout(timer);
        target.removeEventListener("message", handler);
        if (returnStatus && typeof _handlerData === "object") {
          _handlerData._handlerSuccess = _handlerSuccess;
        }
        resolve(_handlerData);
      } as EventListener;

      // Listen to the message return
      target.addEventListener("message", handler);
      const timer = setTimeout(() => {
        if (resolved) {
          return;
        }
        logError(`Timeout for ${name as string} in ${this.config.name}`);
        resolved = true;
        target.removeEventListener("message", handler);
        resolve(void 0);
      }, timeout);
    }) as Promise<any>;
  }

  async call(func: string, args: any[]) {
    // @ts-expect-error - This is a dynamic call
    return await this.exec("_call", { func, args });
  }

  async get(key: string) {
    // @ts-expect-error - This is a dynamic call
    return await this.exec("_get", { key });
  }

  async set(key: string, value: any) {
    // @ts-expect-error - This is a dynamic call
    return await this.exec("_set", { key, value });
  }

  async eval(code: string) {
    // @ts-expect-error - This is a dynamic call
    return await this.exec("_eval", { code });
  }

  async send(options: {
    name: string;
    data: any;
    jobID?: string;
    success?: boolean;
    requestReturn?: boolean;
  }) {
    const { name, data: params } = options;
    let { jobID, success, requestReturn } = options;
    if (!jobID) {
      jobID = randomJobID();
    }
    if (typeof success === "undefined") {
      success = true;
    }
    if (typeof requestReturn === "undefined") {
      requestReturn = true;
    }
    if (this.config.dev) {
      logError(
        `Sending message ${name} from ${
          this.config.name
        }, ${new Date().toISOString()}`,
      );
    }
    const message = {
      _jobID: jobID,
      _senderName: this.config.name,
      _handlerName: name,
      _requestReturn: requestReturn,
      _handlerData: params,
    } as any;
    if (this.config.returnStatus) {
      message._handlerSuccess = success;
    }
    this.config.target.postMessage(message);
    return jobID;
  }

  async isTargetAlive() {
    if (!this.target) {
      return false;
    }
    if (typeof (this.target as Window).closed !== "undefined") {
      // Window
      return !(this.target as Window).closed;
    } else {
      // We don't have a way to check if a worker is alive.
      // We can only check if the worker is a service worker
      const ret = await this.exec("_ping", undefined, { timeout: 200 });
      return ret === "pong";
    }
  }

  static wrapHandlers<T extends Record<string, (...params: any) => any>>(
    funcs: T,
  ): {
    [K in keyof T]: (
      data: Parameters<T[K]>,
    ) => Promise<Awaited<ReturnType<T[K]>>>;
  } {
    return Object.entries(funcs).reduce((acc, [key, value]) => {
      acc[key] = async (data: Parameters<typeof value>) => {
        return await value(...data);
      };
      return acc;
    }, {} as MessageHandlers) as any;
  }
}
