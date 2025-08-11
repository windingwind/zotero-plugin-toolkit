// @ts-check

/** @type {import('typedoc').TypeDocOptions & import('typedoc-plugin-markdown').PluginOptions} */
export default {
  plugin: ["typedoc-plugin-markdown", "typedoc-vitepress-theme"],
  out: "./docs/reference",
  entryPoints: ["./src/index.ts"],
  excludeInternal: true,

  hideBreadcrumbs: true,
  useCodeBlocks: true,
  formatWithPrettier: true,
  flattenOutputFiles: true,
  // disableGit: true,
  readme: "none",

  // @ts-expect-error VitePress config
  docsRoot: "./docs/",
  sidebar: {
    autoConfiguration: true,
    format: "vitepress",
    pretty: false,
    collapsed: true,
  },
};
