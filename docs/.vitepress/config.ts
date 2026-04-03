import { defineConfig } from "vitepress";

export default defineConfig({
  title: "UK x-gov Repo Query",
  description: "A query tool for UK government open-source repositories",
  base: "/uk-x-gov-repo-query/",

  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/reference" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Querying Repos", link: "/guide/querying" },
        ],
      },
      {
        text: "API Reference",
        items: [{ text: "Functions", link: "/api/reference" }],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/uk-x-gov-software-community/uk-x-gov-repo-query",
      },
    ],

    footer: {
      message: "Released under the MIT Licence.",
    },
  },
});
