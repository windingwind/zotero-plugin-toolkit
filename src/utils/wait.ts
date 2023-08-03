import { BasicTool } from "../basic";

const basicTool = new BasicTool();

export function waitUntil(
  condition: () => boolean,
  callback: () => void,
  interval = 100,
  timeout = 10000
) {
  const start = Date.now();
  const intervalId = basicTool.getGlobal("setInterval")(() => {
    if (condition()) {
      basicTool.getGlobal("clearInterval")(intervalId);
      callback();
    } else if (Date.now() - start > timeout) {
      basicTool.getGlobal("clearInterval")(intervalId);
    }
  }, interval);
}

export function waitUtilAsync(
  condition: () => boolean,
  interval = 100,
  timeout = 10000
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const intervalId = basicTool.getGlobal("setInterval")(() => {
      if (condition()) {
        basicTool.getGlobal("clearInterval")(intervalId);
        resolve();
      } else if (Date.now() - start > timeout) {
        basicTool.getGlobal("clearInterval")(intervalId);
        reject();
      }
    }, interval);
  });
}
