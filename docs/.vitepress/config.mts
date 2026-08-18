import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Graffy',
  description:
    "Graffy is an open source library to serve and consume your app's data over deliciously fast and intuitive APIs.",
  base: '/graffy/',
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Reference', link: '/reference/structures' },
      { text: 'Guides', link: '/guides/patterns' },
      { text: 'Internals', link: '/internals/' },
      { text: 'GitHub', link: 'https://github.com/usegraffy/graffy' },
    ],

    sidebar: [
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'Structures', link: '/reference/structures' },
          { text: 'Attributes', link: '/reference/attributes' },
          { text: 'Pagination', link: '/reference/pagination' },
          { text: 'References', link: '/reference/references' },
          { text: 'Versioning', link: '/reference/versioning' },
          { text: 'Store API', link: '/reference/store-api' },
        ],
      },
      {
        text: 'Guides',
        collapsed: false,
        items: [
          { text: 'Patterns', link: '/guides/patterns' },
          { text: 'Providers', link: '/guides/providers' },
        ],
      },
      {
        text: 'Internals',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/internals/' },
          { text: 'Data structures', link: '/internals/data-structures' },
          { text: 'Tree operations', link: '/internals/tree-operations' },
          { text: 'Key encoding', link: '/internals/key-encoding' },
          { text: 'Graffy Core', link: '/internals/graffy-core' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/usegraffy/graffy' },
    ],

    search: {
      provider: 'local',
    },
  },
});
