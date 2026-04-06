/**
 * Environment detection for zotero-plugin-toolkit.
 *
 * Supports four environments:
 * - "html-window": standard DOM, no privileged APIs, no PERMISSIONS global
 * - "html-worker": Web Worker, no DOM, no Zotero, no PERMISSIONS global
 * - "unprivileged-sandbox": Zotero plugin sandbox with PERMISSIONS global, no Components/ChromeUtils/Services
 * - "privileged-sandbox": Zotero plugin sandbox with full privileged access
 *
 * In sandbox environments, `globalThis.PERMISSIONS` (a `readonly string[]`) declares
 * which Zotero APIs the plugin has access to. The toolkit checks this to guard
 * module usage at runtime.
 */

export type ToolkitEnv =
  | "html-window"
  | "html-worker"
  | "unprivileged-sandbox"
  | "privileged-sandbox";

/**
 * Known Zotero plugin permissions from manifest.json.
 * Modules that depend on specific permissions should check via `hasPermission()`.
 */
export type ZoteroPermission =
  | "default"
  | "data"
  | "preferences"
  | "itemPane"
  | "itemTree"
  | "menu"
  | "preferencePane"
  | "reader"
  | "network"
  | "window"
  | "mainWindow"
  | "windowResource"
  | "openWindow"
  | "userPrompt"
  | "fileSystem"
  | "translator";

let _cachedEnv: ToolkitEnv | undefined;

/**
 * Detect the current execution environment.
 *
 * If `globalThis.PERMISSIONS` exists, we are in a sandbox (privileged or unprivileged).
 * Otherwise, fall back to DOM/worker detection.
 *
 * Result is cached after the first call.
 */
export function detectEnv(): ToolkitEnv {
  if (_cachedEnv) return _cachedEnv;

  // PERMISSIONS global exists → we are in a Zotero plugin sandbox
  if (typeof (globalThis as any).PERMISSIONS !== "undefined") {
    if (
      typeof Components !== "undefined" &&
      typeof ChromeUtils !== "undefined"
    ) {
      _cachedEnv = "privileged-sandbox";
    } else {
      _cachedEnv = "unprivileged-sandbox";
    }
  } else if (typeof globalThis.document !== "undefined") {
    _cachedEnv = "html-window";
  } else {
    _cachedEnv = "html-worker";
  }
  return _cachedEnv;
}

/** Whether we are running inside a Zotero plugin sandbox (privileged or unprivileged). */
export function isSandbox(): boolean {
  const env = detectEnv();
  return env === "privileged-sandbox" || env === "unprivileged-sandbox";
}

/** Whether the `Zotero` global is available. True in both sandbox types. */
export function hasZotero(): boolean {
  return typeof Zotero !== "undefined";
}

/** Whether privileged APIs (Components, ChromeUtils, Services) are available. True in privileged-sandbox only. */
export function hasPrivilegedAPIs(): boolean {
  return detectEnv() === "privileged-sandbox";
}

/** Whether DOM APIs (document, window) are available. True in html-window. */
export function hasDOM(): boolean {
  return typeof globalThis.document !== "undefined";
}

/**
 * Check if a specific Zotero plugin permission is granted.
 *
 * In sandbox environments, checks `globalThis.PERMISSIONS`.
 * In non-sandbox environments (html-window, html-worker), always returns false.
 * In privileged-sandbox, always returns true (privileged plugins have all permissions).
 *
 * @param permission The permission string from manifest.json
 */
export function hasPermission(permission: ZoteroPermission): boolean {
  if (hasPrivilegedAPIs()) {
    return true;
  }
  const perms = (globalThis as any).PERMISSIONS as
    | readonly string[]
    | undefined;
  if (!perms) {
    return false;
  }
  return perms.includes(permission);
}

type Capability = "zotero" | "privileged" | "dom";

const capabilityChecks: Record<Capability, () => boolean> = {
  zotero: hasZotero,
  privileged: hasPrivilegedAPIs,
  dom: hasDOM,
};

/**
 * Assert that a capability is available. Throws if not.
 * @param capability The required capability
 * @param caller Name of the calling module/method for the error message
 */
export function requireEnv(capability: Capability, caller: string): void {
  if (!capabilityChecks[capability]()) {
    throw new Error(
      `[zotero-plugin-toolkit] ${caller} requires "${capability}", but the current environment is "${detectEnv()}".`,
    );
  }
}

/**
 * Assert that a specific Zotero permission is granted. Throws if not.
 * @param permission The required permission from manifest.json
 * @param caller Name of the calling module/method for the error message
 */
export function requirePermission(
  permission: ZoteroPermission,
  caller: string,
): void {
  if (!hasPermission(permission)) {
    throw new Error(
      `[zotero-plugin-toolkit] ${caller} requires permission "${permission}", ` +
        `but it is not granted. Add "${permission}" to your manifest.json permissions.`,
    );
  }
}

/**
 * Check if a capability is available. Logs a warning and returns false if not.
 * @param capability The required capability
 * @param caller Name of the calling module/method for the warning message
 */
export function checkEnv(capability: Capability, caller: string): boolean {
  if (!capabilityChecks[capability]()) {
    console.warn(
      `[zotero-plugin-toolkit] ${caller} requires "${capability}", but the current environment is "${detectEnv()}". This call will be skipped.`,
    );
    return false;
  }
  return true;
}
