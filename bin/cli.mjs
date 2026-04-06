#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "assets");

const commands = {
  "init-dialog": initDialog,
  help,
};

function help() {
  console.log(`Usage: zotero-plugin-toolkit <command>

Commands:
  init-dialog [--dest <path>]   Copy dialog.html template into your addon directory.
                                Default dest: addon/chrome/content
  help                          Show this help message.

Examples:
  npx zotero-plugin-toolkit init-dialog
  npx zotero-plugin-toolkit init-dialog --dest addon/chrome/content
`);
}

function initDialog() {
  // Parse --dest flag
  const args = process.argv.slice(3);
  let dest = "addon/chrome/content";
  const destIdx = args.indexOf("--dest");
  if (destIdx !== -1 && args[destIdx + 1]) {
    dest = args[destIdx + 1];
  }

  const targetDir = resolve(process.cwd(), dest);

  // Ensure target directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${dest}`);
  }

  // Copy dialog.html
  const src = join(assetsDir, "dialog.html");
  const target = join(targetDir, "dialog.html");

  if (existsSync(target)) {
    console.log(
      `  dialog.html already exists at ${dest}/dialog.html, skipping.`,
    );
  } else {
    copyFileSync(src, target);
    console.log(`  Copied dialog.html → ${dest}/dialog.html`);
  }

  console.log(
    `\nDone. The DialogHelper will use "chrome/content/dialog.html" by default in unprivileged mode.`,
  );
}

// Main
const command = process.argv[2] || "help";
if (command in commands) {
  commands[command]();
} else {
  console.error(`Unknown command: ${command}`);
  help();
  process.exit(1);
}
