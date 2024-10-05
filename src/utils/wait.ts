import { BasicTool } from "../basic.js";

const basicTool = new BasicTool();

export { waitUntil, waitUtilAsync, waitForReader };

function waitUntil(
  condition: () => boolean,
  callback: () => void,
  interval = 100,
  timeout = 10000,
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

function waitUtilAsync(
  condition: () => boolean,
  interval = 100,
  timeout = 10000,
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

async function waitForReader(reader: _ZoteroTypes.ReaderInstance) {
  await reader._initPromise;
  await reader._lastView.initializedPromise;
  if (reader.type == "pdf")
    await (reader as _ZoteroTypes.ReaderInstance<"pdf">)._lastView
      ._iframeWindow!.PDFViewerApplication.initializedPromise;
}
