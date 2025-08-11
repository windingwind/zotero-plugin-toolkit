import { defineConfig } from "vitepress";
import typedocSidebar from "../reference/typedoc-sidebar.json";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Zotero Plugin Toolkit",
  description:
    "Delivering a Modern and Elegant Development Experience for Zotero Plugins.",
  base: "/zotero-plugin-toolkit/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/" },
      { text: "Reference", link: "/reference/", activeMatch: "/reference/" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [{ text: "Getting Started", link: "/quick-start/" }],
      },
      {
        text: "Reference",
        items: typedocSidebar,
      },
    ],
    outline: [2, 3],
  },
});
