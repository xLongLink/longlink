import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'src',
  title: 'LongLink',
  description: 'LongLink documentation',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Control Plane', link: '/' },
      { text: 'Applications SDK', link: '/applications-sdk/' }
    ],

    sidebar: [
      {
        text: 'Control Plane',
        items: [
          { text: 'Overview', link: '/' }
        ]
      },
      {
        text: 'Applications SDK',
        items: [
          { text: 'Overview', link: '/applications-sdk/' },
          {
            text: 'Pages',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/applications-sdk/pages/' }
            ]
          },
          {
            text: 'Storage',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/applications-sdk/storage/' }
            ]
          },
          {
            text: 'Database',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/applications-sdk/database/' }
            ]
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
