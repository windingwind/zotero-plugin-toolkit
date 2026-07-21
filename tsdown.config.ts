import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/ztoolkit.ts"],
  // unbundle: true,
  sourcemap: false,
  platform: "browser",
  exports: true,
});
