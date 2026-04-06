export function waitUntil(
  condition: () => boolean,
  callback: () => void,
  interval = 100,
  timeout = 10000,
) {
  const start = Date.now();
  const intervalId = globalThis.setInterval(() => {
    if (condition()) {
      globalThis.clearInterval(intervalId);
      callback();
    } else if (Date.now() - start > timeout) {
      globalThis.clearInterval(intervalId);
    }
  }, interval);
}

// For compatibility
export const waitUtilAsync = waitUntilAsync;
export function waitUntilAsync(
  condition: () => boolean,
  interval = 100,
  timeout = 10000,
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const intervalId = globalThis.setInterval(() => {
      if (condition()) {
        globalThis.clearInterval(intervalId);
        resolve();
      } else if (Date.now() - start > timeout) {
        globalThis.clearInterval(intervalId);
        reject(new Error("timeout"));
      }
    }, interval);
  });
}
